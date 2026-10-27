/**
 * Gemini 3.8 Flash — Medical AI Service
 * Analyzes medical reports, prescriptions, and lab results from images or PDFs.
 */

import { Platform } from 'react-native';

export const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
];

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
  // If already a base64 data URI
  if (fileUri.startsWith('data:')) {
    const commaIdx = fileUri.indexOf(',');
    return commaIdx !== -1 ? fileUri.slice(commaIdx + 1) : fileUri;
  }

  // Web environment / Blob URL / Remote URL
  if (Platform.OS === 'web' || fileUri.startsWith('blob:') || fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
    const res = await fetch(fileUri);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const commaIdx = result.indexOf(',');
        resolve(commaIdx !== -1 ? result.slice(commaIdx + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Native environment — use expo-file-system/legacy per Expo SDK 54+ requirement
  try {
    const LegacyFileSystem = await import('expo-file-system/legacy');
    const base64 = await LegacyFileSystem.readAsStringAsync(fileUri, {
      encoding: LegacyFileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (err) {
    console.warn('LegacyFileSystem read failed, attempting File API fallback:', err);
    // Secondary fallback using File class
    const { File } = await import('expo-file-system');
    const file = new File(fileUri);
    if (typeof (file as unknown as { base64: () => Promise<string> }).base64 === 'function') {
      return await (file as unknown as { base64: () => Promise<string> }).base64();
    }
    throw err;
  }
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 14000);

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as Record<string, unknown>;
        const errObj = err?.error as Record<string, unknown> | undefined;
        lastErrorMsg = (errObj?.message as string) ?? `Gemini API error ${response.status}`;
        console.warn(`[Gemini] Model ${model} returned HTTP ${response.status}: ${lastErrorMsg.slice(0, 100)}`);
        // If 503 (high demand), 429 (rate limit), 404 (not found), or 500, try next candidate model!
        continue;
      }

      const data = await response.json() as Record<string, unknown>;
      const candidates = data?.candidates as Record<string, unknown>[];
      const content = candidates?.[0]?.content as Record<string, unknown>;
      const parts2 = content?.parts as Record<string, unknown>[];
      const textParts = parts2
        ?.map(p => (typeof p.text === 'string' ? p.text : ''))
        .filter(t => t.trim().length > 0);
      const text = textParts?.join('\n');

      if (!text) {
        console.warn(`[Gemini] Model ${model} returned empty content, trying next model`);
        continue;
      }

      return text;
    } catch (e) {
      clearTimeout(timeoutId);
      const isAbort = e instanceof Error && (e.name === 'AbortError' || e.message.includes('aborted'));
      lastErrorMsg = isAbort ? `Request to ${model} timed out` : (e instanceof Error ? e.message : 'Network error');
      console.warn(`[Gemini] Model ${model} failed: ${lastErrorMsg}`);
      // Continue to next model on timeout or network drop
      continue;
    }
  }

  throw new Error(lastErrorMsg || 'Unable to connect to Gemini API models. Please check your connection.');
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

export function cleanAiMarkdown(text: string): string {
  // Normalize bullet points: replace lines starting with "* " or "- " with "• "
  let cleaned = text.replace(/^[\*\-]\s+/gm, '• ');
  // Remove markdown header marks (###, ##, #)
  cleaned = cleaned.replace(/^#{1,4}\s+/gm, '');
  return cleaned.trim();
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

FORMATTING GUIDELINES:
- Write in clean, natural, plain English without raw markdown asterisks (avoid ** or *).
- Use round bullets (•) for any listed items.
- Provide a clear, compassionate, and accurate answer in 2-4 sentences.
- Always recommend consulting their doctor for final medical decisions.`;

  const parts: GeminiPart[] = [{ text: context }];
  try {
    const raw = await callGemini(parts);
    return cleanAiMarkdown(raw);
  } catch (e) {
    console.warn('[Gemini] askFollowUpQuestion failed:', e);
    return `Based on your report (${previousAnalysis.reportType}):\n• Always review these specific values directly with your physician.\n• Make sure to follow any medication dosages listed in the report.\n• If you are experiencing sudden dizziness, pain, or shortness of breath, please contact your clinic immediately.`;
  }
}

export function getOfflineMedicalGuidance(query: string): string {
  const lower = query.toLowerCase();
  if (lower.includes('paracetamol') && lower.includes('ibuprofen')) {
    return 'Generally, Paracetamol and Ibuprofen can be taken together or alternated because they belong to different drug classes (analgesic vs NSAID).\n\n• Always check maximum daily limits (never exceed 4,000 mg Paracetamol in 24 hours for adults).\n• Always take Ibuprofen with or after food to protect your stomach.\n• Avoid combining if you have liver conditions, kidney problems, or active stomach ulcers.\n• Consult your doctor or pharmacist if symptoms persist beyond 3 days.';
  }
  if (lower.includes('miss') || (lower.includes('dose') && lower.includes('morning'))) {
    return 'If you missed a scheduled dose:\n\n• Take it as soon as you remember, unless it is already close to your next scheduled dose.\n• Never take a double dose or extra medication to make up for the missed one.\n• If it is close to your next dose, skip the missed dose and resume your normal schedule.\n• You can check the medication leaflet in Medora or ask your pharmacist.';
  }
  if (lower.includes('esr') || lower.includes('blood test') || lower.includes('crp')) {
    return 'ESR (Erythrocyte Sedimentation Rate) is a general blood test marker that measures inflammation in the body:\n\n• Elevated ESR indicates that an inflammatory or infectious process is occurring.\n• It is non-specific, meaning it signals inflammation exists but does not identify the exact cause by itself.\n• Doctors typically evaluate ESR alongside CRP, complete blood count (CBC), and physical symptoms to reach a diagnosis.';
  }
  if (lower.includes('food') || lower.includes('avoid') || lower.includes('pressure') || lower.includes('bp')) {
    return 'When managing blood pressure and taking hypertension medications:\n\n• Avoid high-sodium foods, canned soups, and salty snacks, as salt directly increases blood pressure.\n• If you are taking ACE inhibitors or ARBs, moderate potassium-rich salt substitutes.\n• Avoid grapefruit and grapefruit juice if taking calcium channel blockers (e.g. Amlodipine).\n• Limit caffeine and alcohol intake and drink adequate water daily.';
  }
  return 'Here is general medical guidance for your question:\n\n• Always follow the dosage, timing, and storage instructions on your prescription package.\n• Do not alter, pause, or stop prescribed medications without consulting your prescribing doctor.\n• If you notice any unusual side effects (such as rash, swelling, or nausea), notify your healthcare provider.\n• For any urgent symptoms or chest discomfort, seek immediate medical attention.';
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

FORMATTING RULES:
- Do NOT use markdown bold asterisks like **word**.
- For lists, use the round bullet symbol • instead of * or -.
- Write in clean, beautifully readable paragraphs.

Previous conversation:
${historyText || 'None'}

User: ${question}

Provide a concise, helpful, and empathetic answer (2-4 paragraphs max):`;

  const parts: GeminiPart[] = [{ text: prompt }];
  try {
    const raw = await callGemini(parts);
    return cleanAiMarkdown(raw);
  } catch (e) {
    console.warn('[Gemini] askGeneralMedicalAI remote call failed, using clinical fallback:', e);
    return getOfflineMedicalGuidance(question);
  }
}
