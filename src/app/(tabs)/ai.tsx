/**
 * Medora AI Hub — Health Assistant & Report Analyzer powered by Gemini 1.5 Flash
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { Gradient } from '@/components/ui/Gradient';
import { useProfile } from '@/store/profileStore';
import { getReportsByProfile } from '@/db/reports';
import { MedicalReport } from '@/types';
import { askGeneralMedicalAI } from '@/services/gemini';
import { AiReportAnalysisModal } from '@/components/reports/AiReportAnalysisModal';
import { FormattedAiText } from '@/components/ui/FormattedAiText';
import { fileExists } from '@/services/fileStorage';
import { formatDate } from '@/utils/date';

import { AiThinkingBubble } from '@/components/ai/AiThinkingBubble';
import { ChatReportCard } from '@/components/ai/ChatReportCard';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  time: string;
  isError?: boolean;
  retryText?: string;
  attachedReports?: MedicalReport[];
}

const QUICK_PROMPTS = [
  '📄 Show my saved reports & PDFs',
  '🩸 What does high ESR indicate?',
  '💊 Can I take Paracetamol with Ibuprofen?',
  '⏰ What if I miss my morning dose?',
  '🥗 Foods to avoid with blood pressure meds?',
];

let _msgIdCounter = 0;
function createMessageId(): string {
  _msgIdCounter += 1;
  return `msg_${Date.now()}_${_msgIdCounter}`;
}

function getFormattedTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

let _cachedAiReports: MedicalReport[] = [];

export default function AiHubScreen() {
  const { activeProfile } = useProfile();
  const [activeTab, setActiveTab] = useState<'chat' | 'reports'>('chat');

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: 'Hello! I am Medora AI, your personal health assistant powered by Google Gemini Medical AI. You can ask me any questions about medications, symptoms, lab test results, or ask me to show and review your saved reports & PDFs. How can I help you today?',
      time: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedReportForChat, setSelectedReportForChat] = useState<MedicalReport | null>(null);
  const [showReportPicker, setShowReportPicker] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Reports State
  const [reports, setReports] = useState<MedicalReport[]>(_cachedAiReports);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null);
  const [selectedReportFileOk, setSelectedReportFileOk] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);

  const loadReports = useCallback(async () => {
    if (!activeProfile) return;
    try {
      const data = await getReportsByProfile(activeProfile.id);
      _cachedAiReports = data;
      setReports(data);
    } catch (e) {
      console.error('Failed to load reports in AI hub:', e);
    } finally {
      setReportsLoading(false);
    }
  }, [activeProfile]);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || chatLoading) return;

    setInputText('');
    const attachedReport = selectedReportForChat;
    setSelectedReportForChat(null);
    setShowReportPicker(false);

    const now = getFormattedTime();
    const userMsg: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      text,
      time: now,
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatLoading(true);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);

    try {
      // Check if user specifically attached a report OR asked about reports in their question
      const isAskingAboutReports =
        !!attachedReport ||
        /report|test|result|prescription|lab|scan|mri|x-ray|blood|cbc|doctor|dikh|batao|check|pdf/i.test(
          text
        );

      let matchingReports: MedicalReport[] = [];
      if (attachedReport) {
        matchingReports = [attachedReport];
      } else if (isAskingAboutReports && reports.length > 0) {
        // Find matching reports by title or category if specified, else provide latest reports
        const lowerText = text.toLowerCase();
        const keywordMatches = reports.filter(
          r =>
            lowerText.includes(r.title.toLowerCase()) ||
            lowerText.includes(r.category.toLowerCase()) ||
            (r.doctorOrHospital && lowerText.includes(r.doctorOrHospital.toLowerCase()))
        );

        if (keywordMatches.length > 0) {
          matchingReports = keywordMatches;
        } else {
          // General report request (e.g., "show my reports", "pdf dikhao", "meri test report") -> show up to 3 latest reports
          matchingReports = reports.slice(0, 3);
        }
      }

      const reportSummaries = reports.map(r => ({
        id: r.id,
        title: r.title,
        category: r.category,
        documentDate: r.documentDate,
        fileType: r.fileType,
        doctorOrHospital: r.doctorOrHospital,
        notes: r.notes,
      }));

      const aiReply = await askGeneralMedicalAI(
        text,
        chatMessages.map(m => ({ role: m.role, text: m.text })),
        reportSummaries
      );

      const aiMsg: ChatMessage = {
        id: createMessageId(),
        role: 'ai',
        text: aiReply,
        time: getFormattedTime(),
        attachedReports: matchingReports.length > 0 ? matchingReports : undefined,
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err: unknown) {
      console.warn('AI general chat error:', err);
      const errorMsg: ChatMessage = {
        id: createMessageId(),
        role: 'ai',
        text: 'I had trouble connecting to the medical network. Please verify your connection or tap below to retry.',
        time: getFormattedTime(),
        isError: true,
        retryText: text,
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 120);
    }
  };

  const handleAnalyzeReport = async (report: MedicalReport) => {
    const exists = await fileExists(report.filePath);
    setSelectedReport(report);
    setSelectedReportFileOk(exists);
    setAiModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ─── Hero Header ─── */}
      <Gradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>✨ Medora AI</Text>
          </View>
          <View style={styles.modelPill}>
            <View style={styles.onlineDot} />
            <Text style={styles.modelText}>Gemini Medical AI</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>Health & Report AI</Text>
        <Text style={styles.heroSubtitle}>
          Instant medical report analysis, medication insights & doctor-guided explanations.
        </Text>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'chat' && styles.tabBtnActive]}
            onPress={() => setActiveTab('chat')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'chat' && styles.tabBtnTextActive]}>
              💬 Medical Chat
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'reports' && styles.tabBtnActive]}
            onPress={() => setActiveTab('reports')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'reports' && styles.tabBtnTextActive]}>
              📄 Analyze Reports ({reports.length})
            </Text>
          </TouchableOpacity>
        </View>
      </Gradient>

      {/* ─── Tab 1: Medical Chat ─── */}
      {activeTab === 'chat' && (
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatScrollContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (chatLoading) {
                scrollRef.current?.scrollToEnd({ animated: true });
              }
            }}
          >
            {/* Quick Prompts */}
            <Text style={styles.quickPromptHeader}>💡 Suggested Health Questions:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickScroll}
              contentContainerStyle={styles.quickScrollContent}
            >
              {QUICK_PROMPTS.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickChip}
                  onPress={() => handleSendMessage(q)}
                  disabled={chatLoading}
                >
                  <Text style={styles.quickChipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Chat Messages */}
            {chatMessages.map(msg => (
              <View
                key={msg.id}
                style={[
                  styles.msgWrapper,
                  msg.role === 'user' ? styles.userMsgWrapper : styles.aiMsgWrapper,
                ]}
              >
                {msg.role === 'ai' && (
                  <View style={styles.aiAvatar}>
                    <Text style={styles.aiAvatarText}>✨</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.msgBubble,
                    msg.role === 'user' ? styles.userMsgBubble : styles.aiMsgBubble,
                    msg.isError && styles.errorMsgBubble,
                  ]}
                >
                  <FormattedAiText
                    text={msg.text}
                    isUser={msg.role === 'user'}
                    style={[
                      styles.msgText,
                      msg.role === 'user' ? styles.userMsgText : styles.aiMsgText,
                    ]}
                  />

                  {/* Attached Reports / Scans / PDFs in AI response */}
                  {msg.attachedReports && msg.attachedReports.length > 0 && (
                    <View style={styles.chatReportsContainer}>
                      <Text style={styles.chatReportsHeader}>
                        📄 Attached Health Reports ({msg.attachedReports.length})
                      </Text>
                      {msg.attachedReports.map(rep => (
                        <ChatReportCard
                          key={rep.id}
                          report={rep}
                          onView={() => router.push(`/reports/${rep.id}`)}
                          onAnalyze={() => handleAnalyzeReport(rep)}
                        />
                      ))}
                    </View>
                  )}

                  {msg.isError && msg.retryText && (
                    <TouchableOpacity
                      style={styles.retryBtn}
                      onPress={() => handleSendMessage(msg.retryText)}
                      disabled={chatLoading}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.retryBtnText}>🔄 Retry Question</Text>
                    </TouchableOpacity>
                  )}
                  <Text
                    style={[
                      styles.msgTime,
                      msg.role === 'user' ? styles.userMsgTime : styles.aiMsgTime,
                    ]}
                  >
                    {msg.time}
                  </Text>
                </View>
              </View>
            ))}

            {chatLoading && <AiThinkingBubble />}

            <View style={{ height: Spacing[4] }} />
          </ScrollView>

          {/* Attached report chip above input bar */}
          {selectedReportForChat && (
            <View style={styles.attachedBanner}>
              <View style={styles.attachedLeft}>
                <Text style={styles.attachedEmoji}>
                  {selectedReportForChat.fileType === 'pdf' ? '📄' : '🖼️'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attachedLabel}>Asking specifically about:</Text>
                  <Text style={styles.attachedTitle} numberOfLines={1}>
                    {selectedReportForChat.title}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedReportForChat(null)}
                style={styles.attachedRemoveBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.attachedRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Report Picker drawer when paperclip is pressed */}
          {showReportPicker && (
            <View style={styles.reportPickerBox}>
              <View style={styles.reportPickerHeader}>
                <Text style={styles.reportPickerTitle}>📎 Select Report to Ask About</Text>
                <TouchableOpacity onPress={() => setShowReportPicker(false)}>
                  <Text style={styles.reportPickerClose}>✕</Text>
                </TouchableOpacity>
              </View>
              {reports.length === 0 ? (
                <Text style={styles.pickerEmptyText}>No reports found in your vault.</Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pickerScroll}
                >
                  {reports.map(rep => {
                    const isSelected = selectedReportForChat?.id === rep.id;
                    return (
                      <TouchableOpacity
                        key={rep.id}
                        style={[styles.pickerChip, isSelected && styles.pickerChipActive]}
                        onPress={() => {
                          setSelectedReportForChat(isSelected ? null : rep);
                          setShowReportPicker(false);
                        }}
                      >
                        <Text style={styles.pickerChipEmoji}>
                          {rep.fileType === 'pdf' ? '📄' : '🖼️'}
                        </Text>
                        <View style={{ maxWidth: 140 }}>
                          <Text style={styles.pickerChipTitle} numberOfLines={1}>
                            {rep.title}
                          </Text>
                          <Text style={styles.pickerChipDate}>
                            {formatDate(rep.documentDate)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          {/* Chat Input Bar */}
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={[
                styles.attachBtn,
                (showReportPicker || !!selectedReportForChat) && styles.attachBtnActive,
              ]}
              onPress={() => setShowReportPicker(prev => !prev)}
              disabled={chatLoading}
              activeOpacity={0.7}
              accessibilityLabel="Attach report to chat"
            >
              <Text style={styles.attachBtnIcon}>📎</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder={chatLoading ? 'Medora AI is thinking…' : 'Ask about medications, tests, health…'}
              placeholderTextColor={Colors.textDisabled}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!chatLoading}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || chatLoading) && styles.sendBtnDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || chatLoading}
            >
              {chatLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendBtnText}>➤</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ─── Tab 2: Analyze Reports ─── */}
      {activeTab === 'reports' && (
        <View style={styles.reportsContainer}>
          <TouchableOpacity
            style={styles.uploadCta}
            onPress={() => router.push('/reports/add')}
            activeOpacity={0.85}
          >
            <Gradient
              colors={['#27AE60', '#1A8A4A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.uploadCtaGradient}
            >
              <Text style={styles.uploadCtaEmoji}>📤</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadCtaTitle}>Upload New Medical Report</Text>
                <Text style={styles.uploadCtaSubtitle}>
                  PDFs, lab results, prescriptions & scans
                </Text>
              </View>
              <Text style={styles.uploadCtaArrow}>+</Text>
            </Gradient>
          </TouchableOpacity>

          <Text style={styles.reportsListTitle}>Your Vault Documents</Text>

          {reportsLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : reports.length === 0 ? (
            <View style={styles.emptyReports}>
              <Text style={styles.emptyReportsEmoji}>📋</Text>
              <Text style={styles.emptyReportsTitle}>No Reports Added Yet</Text>
              <Text style={styles.emptyReportsText}>
                Upload a blood test, prescription, or medical scan to analyze it with Gemini 3.8 Flash.
              </Text>
              <TouchableOpacity
                style={styles.emptyUploadBtn}
                onPress={() => router.push('/reports/add')}
              >
                <Text style={styles.emptyUploadBtnText}>+ Upload First Report</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={reports}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.reportsListContent}
              renderItem={({ item }) => (
                <View style={styles.reportRowCard}>
                  <View style={styles.reportRowLeft}>
                    <Text style={styles.reportRowIcon}>
                      {item.fileType === 'pdf' ? '📄' : '🖼️'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportRowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.reportRowMeta}>
                        {formatDate(item.documentDate)} • {item.category}
                        {item.doctorOrHospital ? ` • ${item.doctorOrHospital}` : ''}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.analyzeBtn}
                    onPress={() => handleAnalyzeReport(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.analyzeBtnText}>✨ Analyze</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* ─── AI Modal ─── */}
      {selectedReport && (
        <AiReportAnalysisModal
          visible={aiModalVisible}
          onClose={() => setAiModalVisible(false)}
          report={selectedReport}
          fileAvailable={selectedReportFileOk}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Hero
  hero: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[4],
    borderBottomLeftRadius: Radius['2xl'],
    borderBottomRightRadius: Radius['2xl'],
    ...Shadows.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  aiBadge: {
    backgroundColor: '#ffffff22',
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#ffffff33',
  },
  aiBadgeText: { color: '#FFD700', fontSize: Typography.sm, fontWeight: Typography.bold },
  modelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff15',
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 6,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  modelText: { color: '#ffffffcc', fontSize: Typography.xs, fontWeight: Typography.medium },
  heroTitle: { color: '#FFFFFF', fontSize: Typography['2xl'], fontWeight: Typography.bold },
  heroSubtitle: {
    color: '#ffffffaa',
    fontSize: Typography.xs,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: Spacing[3],
  },

  // Tab Switcher
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#ffffff15',
    borderRadius: Radius.lg,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing[2],
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    ...Shadows.sm,
  },
  tabBtnText: {
    color: '#ffffffbb',
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
  },
  tabBtnTextActive: {
    color: '#1A1A2E',
    fontWeight: Typography.bold,
  },

  // Chat
  keyboardContainer: { flex: 1 },
  chatScroll: { flex: 1 },
  chatScrollContent: { padding: Spacing[4] },
  quickPromptHeader: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing[2],
  },
  quickScroll: { marginBottom: Spacing[4] },
  quickScrollContent: { gap: Spacing[2] },
  quickChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  quickChipText: { fontSize: Typography.xs, color: Colors.textPrimary, fontWeight: Typography.medium },

  msgWrapper: {
    flexDirection: 'row',
    marginBottom: Spacing[3],
    gap: Spacing[2],
  },
  userMsgWrapper: { justifyContent: 'flex-end' },
  aiMsgWrapper: { justifyContent: 'flex-start', alignItems: 'flex-start' },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  aiAvatarText: { fontSize: 16 },
  msgBubble: {
    maxWidth: '82%',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2] + 2,
    borderRadius: Radius.lg,
  },
  userMsgBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.sm,
  },
  aiMsgBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  errorMsgBubble: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FEB2B2',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginTop: Spacing[2],
  },
  retryBtnText: {
    fontSize: Typography.xs,
    color: '#FFFFFF',
    fontWeight: Typography.semibold,
  },
  msgText: { fontSize: Typography.sm, lineHeight: 20 },
  userMsgText: { color: '#FFFFFF' },
  aiMsgText: { color: Colors.textPrimary },
  msgTime: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userMsgTime: { color: '#ffffffaa' },
  aiMsgTime: { color: Colors.textDisabled },

  // Chat Report Attachments
  chatReportsContainer: {
    marginTop: Spacing[2],
    paddingTop: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  chatReportsHeader: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing[2],
    letterSpacing: 0.2,
  },

  // Attached Document Pre-send Banner
  attachedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  attachedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    flex: 1,
    marginRight: Spacing[2],
  },
  attachedEmoji: {
    fontSize: 20,
  },
  attachedLabel: {
    fontSize: 10,
    color: '#1D4ED8',
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  attachedTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: '#1E3A8A',
  },
  attachedRemoveBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedRemoveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1D4ED8',
  },

  // Report Picker Drawer
  reportPickerBox: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
    ...Shadows.md,
  },
  reportPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[2],
  },
  reportPickerTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  reportPickerClose: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    padding: 2,
  },
  pickerEmptyText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  pickerScroll: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[2],
    paddingBottom: Spacing[1],
  },
  pickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.lg,
  },
  pickerChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  pickerChipEmoji: {
    fontSize: 18,
  },
  pickerChipTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  pickerChipDate: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  // Input Bar
  inputBar: {
    flexDirection: 'row',
    padding: Spacing[3],
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
    gap: Spacing[2],
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  attachBtnIcon: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[4],
    paddingVertical: Platform.OS === 'ios' ? Spacing[2] + 2 : Spacing[2],
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.gray300,
  },
  sendBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  // Reports Tab
  reportsContainer: { flex: 1, padding: Spacing[4] },
  uploadCta: { borderRadius: Radius.xl, overflow: 'hidden', marginBottom: Spacing[4], ...Shadows.md },
  uploadCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    gap: Spacing[3],
  },
  uploadCtaEmoji: { fontSize: 26 },
  uploadCtaTitle: { color: '#FFFFFF', fontSize: Typography.md, fontWeight: Typography.bold },
  uploadCtaSubtitle: { color: '#ffffffcc', fontSize: Typography.xs, marginTop: 2 },
  uploadCtaArrow: { color: '#FFFFFF', fontSize: 28, fontWeight: Typography.regular },

  reportsListTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing[3],
  },
  reportsListContent: { gap: Spacing[3], paddingBottom: Spacing[8] },
  reportRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  reportRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], flex: 1, marginRight: Spacing[2] },
  reportRowIcon: { fontSize: 24 },
  reportRowTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  reportRowMeta: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  analyzeBtn: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
  },
  analyzeBtnText: { color: '#FFD700', fontSize: Typography.xs, fontWeight: Typography.bold },

  emptyReports: {
    alignItems: 'center',
    padding: Spacing[6],
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing[4],
  },
  emptyReportsEmoji: { fontSize: 48, marginBottom: Spacing[2] },
  emptyReportsTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  emptyReportsText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: Spacing[2],
    lineHeight: 20,
  },
  emptyUploadBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2] + 2,
    borderRadius: Radius.full,
    marginTop: Spacing[2],
  },
  emptyUploadBtnText: { color: '#FFFFFF', fontSize: Typography.sm, fontWeight: Typography.semibold },
});
