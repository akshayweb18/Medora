/**
 * Gemini 3.8 Flash — Medical AI Service
 * Analyzes medical reports, prescriptions, and lab results from images or PDFs.
 */

const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest'];

function getGeminiApiUrl(model: string = CANDIDATE_MODELS[0]): string {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AiTestResult {
  name: string;
  value: string;
  unit?: string;
  normalRange?: string;
  status: 'normal' | 'high' | 'low' | 'unknown';
}

export interface AiMedicineExtracted {
  name: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

export interface AiReportAnalysis {
  summary: string;
  keyFindings: string[];
  testResults?: AiTestResult[];
  medicines?: AiMedicineExtracted[];
  warnings: string[];
  recommendations: string[];
  reportType: string;
  patientInfo?: {
    name?: string;
    age?: string;
    gender?: string;
    date?: string;
    doctorName?: string;
  };
  rawText?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function uriToBase64(fileUri: string): Promise<string> {
  const FileSystem = await import('expo-file-system');
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
}

function getMimeType(filePath: string, fileType: 'pdf' | 'image'): string {
  if (fileType === 'pdf') return 'application/pdf';
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Medora AI, an expert medical report analyzer. A patient has uploaded a medical document. Your job is to:

1. Identify the type of document (blood test, prescription, X-ray report, MRI, discharge summary, etc.)
2. Extract ALL relevant medical information clearly and accurately
3. Explain findings in simple, patient-friendly language (avoid heavy jargon)
4. Flag any abnormal values, critical results, or important warnings
5. List extracted medicines if it is a prescription
6. Provide practical next steps or recommendations

IMPORTANT RULES:
- Always clarify you are an AI and users should consult their doctor for medical decisions
- Be compassionate and clear — the user may be anxious about their results
- For test values, indicate if they are high, low, or normal based on standard reference ranges
- Extract the doctor name, patient info, and date if visible

Respond ONLY in valid JSON matching this exact structure (no markdown, no code blocks):
{
  "summary": "2-3 sentence plain-English overview",
  "keyFindings": ["finding 1", "finding 2"],
  "testResults": [
    { "name": "Hemoglobin", "value": "11.2", "unit": "g/dL", "normalRange": "12-16", "status": "low" }
  ],
  "medicines": [
    { "name": "Amoxicillin", "strength": "500mg", "dosage": "1 tablet", "frequency": "Twice daily", "duration": "5 days", "notes": "After food" }
  ],
  "warnings": ["Critical: Hemoglobin is below normal range"],
  "recommendations": ["Consult your doctor about low hemoglobin", "Schedule follow-up in 2 weeks"],
  "reportType": "Blood Test",
  "patientInfo": {
    "name": "John Doe",
    "age": "34 years",
    "gender": "Male",
    "date": "2024-01-15",
    "doctorName": "Dr. Smith"
  },
  "rawText": "full extracted text from the document..."
}

If a field has no data (e.g. no medicines in a blood test), use an empty array or omit the field.`;

// ─── Core API Call ────────────────────────────────────────────────────────────

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

async function callGemini(parts: GeminiPart[]): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.');
  }

  let lastErrorMsg = '';

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await fetch(getGeminiApiUrl(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 4096,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as Record<string, unknown>;
        const errObj = err?.error as Record<string, unknown> | undefined;
        lastErrorMsg = (errObj?.message as string) ?? `Gemini API error ${response.status}`;
        if (response.status === 404 || lastErrorMsg.includes('not found') || lastErrorMsg.includes('no longer available')) {
          continue;
        }
        throw new Error(lastErrorMsg);
      }

      const data = await response.json() as Record<string, unknown>;
      const candidates = data?.candidates as Record<string, unknown>[];
      const content = candidates?.[0]?.content as Record<string, unknown>;
      const parts2 = content?.parts as Record<string, unknown>[];
      const text = parts2?.[0]?.text as string | undefined;
      if (!text) throw new Error('No response from Gemini');
      return text;
    } catch (e) {
      if (e instanceof Error && (e.message.includes('not found') || e.message.includes('no longer available'))) {
        continue;
      }
      throw e;
    }
  }

  throw new Error(lastErrorMsg || 'Unable to connect to Gemini API models.');
}

function parseAnalysis(raw: string): AiReportAnalysis {
  let clean = raw.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  try {
    return JSON.parse(clean) as AiReportAnalysis;
  } catch {
    return {
      summary: clean.slice(0, 400),
      keyFindings: [],
      warnings: [],
      recommendations: ['Please consult your doctor for interpretation of this report.'],
      reportType: 'Medical Document',
      rawText: clean,
    };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function analyzeReportWithAI(
  filePath: string,
  fileType: 'pdf' | 'image',
  reportTitle?: string,
  category?: string,
): Promise<AiReportAnalysis> {
  const base64 = await uriToBase64(filePath);
  const mimeType = getMimeType(filePath, fileType);

  const contextHint = reportTitle
    ? `This document is titled "${reportTitle}"${category ? ` and categorized as "${category}"` : ''}.`
    : 'Please analyze the attached medical document.';

  const parts: GeminiPart[] = [
    { text: SYSTEM_PROMPT },
    { inlineData: { mimeType, data: base64 } },
    { text: contextHint },
  ];

  const rawText = await callGemini(parts);
  return parseAnalysis(rawText);
}

export async function askFollowUpQuestion(
  question: string,
  previousAnalysis: AiReportAnalysis,
): Promise<string> {
  const testSummary = previousAnalysis.testResults?.length
    ? `Test Results: ${previousAnalysis.testResults.map(t => `${t.name}: ${t.value}${t.unit ? ' ' + t.unit : ''} (${t.status})`).join(', ')}`
    : '';
  const warnSummary = previousAnalysis.warnings?.length
    ? `Warnings: ${previousAnalysis.warnings.join('; ')}`
    : '';

  const context = `You are Medora AI. A patient has a medical report with this analysis:
Report Type: ${previousAnalysis.reportType}
Summary: ${previousAnalysis.summary}
Key Findings: ${previousAnalysis.keyFindings.join('; ')}
${testSummary}
${warnSummary}

The patient asks: "${question}"

Provide a clear, compassionate, and accurate answer in 2-4 sentences. Always recommend consulting their doctor for final medical decisions.`;

  const parts: GeminiPart[] = [{ text: context }];
  return await callGemini(parts);
}

export async function askGeneralMedicalAI(
  question: string,
  history: { role: 'user' | 'ai'; text: string }[] = [],
): Promise<string> {
  const historyText = history
    .slice(-6)
    .map(h => `${h.role === 'user' ? 'User' : 'Medora AI'}: ${h.text}`)
    .join('\n');

  const prompt = `You are Medora AI, a compassionate, helpful, and accurate medical health assistant powered by Google Gemini.
Your role:
- Answer health, medication, lifestyle, and lab test questions in plain, friendly English.
- Explain drug mechanisms, common dosages, side effects, and instructions (e.g. before/after food).
- Clarify lab ranges and medical jargon.
- Emphasize consulting a qualified doctor for definitive diagnoses or prescription adjustments.
- For emergency symptoms (e.g. chest pain, difficulty breathing, severe stroke signs), immediately advise emergency care.

Previous conversation:
${historyText || 'None'}

User: ${question}

Provide a concise, helpful, and empathetic answer (2-4 paragraphs max).`;

  const parts: GeminiPart[] = [{ text: prompt }];
  return await callGemini(parts);
}
