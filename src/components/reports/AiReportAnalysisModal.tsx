/**
 * AI Report Analysis Modal — Premium UI v2
 * 9 UI upgrades: animated loading steps, shimmer skeleton, progress bar,
 * staggered section entrances, collapsible sections, chat bubble animations,
 * animated close button, share/export, floating scroll-to-top.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gradient } from '@/components/ui/Gradient';
import { FormattedAiText } from '@/components/ui/FormattedAiText';

import { AiMedicineExtracted, AiReportAnalysis, AiTestResult, analyzeReportWithAI, askFollowUpQuestion } from '@/services/gemini';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { MedicalReport } from '@/types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  report: MedicalReport;
  fileAvailable: boolean;
}

// ─── Chat Message ─────────────────────────────────────────────────────────────

interface ChatMsg {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

// ─── Animated Thinking Dots ───────────────────────────────────────────────────

function ThinkingDots() {
  // Use useMemo so Animated.Values are stable across renders without useRef
  const dot1 = React.useMemo(() => new Animated.Value(0), []);
  const dot2 = React.useMemo(() => new Animated.Value(0), []);
  const dot3 = React.useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.delay(800 - delay),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 250);
    const a3 = animate(dot3, 500);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
  });

  return (
    <View style={thinkStyle.row}>
      {[dot1, dot2, dot3].map((d, i) => (
        <Animated.View key={i} style={[thinkStyle.dot, dotStyle(d)]} />
      ))}
    </View>
  );
}

const thinkStyle = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
});

// ─── Animated Send Button ─────────────────────────────────────────────────────

function SendButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  // useMemo keeps Animated.Values stable across re-renders (avoids react-hooks/refs)
  const scaleAnim = React.useMemo(() => new Animated.Value(1), []);
  // Initialized once; useEffect below drives subsequent opacity changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const opacityAnim = React.useMemo(() => new Animated.Value(disabled ? 0.45 : 1), []);

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: disabled ? 0.45 : 1,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [disabled, opacityAnim]);

  const onPressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();

  const onPressOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();

  return (
    <Animated.View
      style={[
        sendBtnStyle.btn,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        android_ripple={{ color: '#ffffff30', borderless: true, radius: 24 }}
      >
        <Gradient colors={['#27AE60', '#1A8A4A']} style={sendBtnStyle.gradient}>
          <Text style={sendBtnStyle.icon}>➤</Text>
        </Gradient>
      </Pressable>
    </Animated.View>
  );
}

const sendBtnStyle = StyleSheet.create({
  btn:      { borderRadius: 24 },
  gradient: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  icon:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});




// ─── Animated Close Button ────────────────────────────────────────────────────

function CloseButton({ onPress }: { onPress: () => void }) {
  const scale = React.useMemo(() => new Animated.Value(1), []);
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.85, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 25, bounciness: 12 }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.closeBtn}
        android_ripple={{ color: '#ffffff30', borderless: true, radius: 20 }}
      >
        <Text style={styles.closeBtnText}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Shimmer Skeleton ─────────────────────────────────────────────────────────

function ShimmerBar({ width, height = 14, style }: { width: number | string; height?: number; style?: object }) {
  const shimmer = React.useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);
  const opacity = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.7, 0.3] });
  return (
    <Animated.View style={[{ width, height, borderRadius: height / 2, backgroundColor: Colors.gray200, opacity }, style]} />
  );
}

function SkeletonCard() {
  return (
    <View style={skeletonStyle.card}>
      <View style={skeletonStyle.header}>
        <ShimmerBar width={80} height={20} />
        <ShimmerBar width={60} height={20} />
      </View>
      <ShimmerBar width="100%" height={12} style={{ marginTop: 12 }} />
      <ShimmerBar width="85%" height={12} style={{ marginTop: 8 }} />
      <ShimmerBar width="70%" height={12} style={{ marginTop: 8 }} />
    </View>
  );
}
const skeletonStyle = StyleSheet.create({
  card:   { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing[4], ...Shadows.sm, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
});

// ─── Animated Loading Steps ───────────────────────────────────────────────────

const LOADING_STEPS = [
  { emoji: '📄', label: 'Reading your medical document…' },
  { emoji: '🔍', label: 'Extracting test values & data…' },
  { emoji: '🧬', label: 'Generating AI insights…' },
  { emoji: '✅', label: 'Almost done…' },
];

function AnimatedLoadingStep() {
  const [stepIdx, setStepIdx] = useState(0);
  const fade = React.useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    const cycle = () => {
      Animated.timing(fade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setStepIdx(prev => (prev + 1) % LOADING_STEPS.length);
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    };
    const t = setInterval(cycle, 2200);
    return () => clearInterval(t);
  }, [fade]);

  const step = LOADING_STEPS[stepIdx];
  return (
    <Animated.View style={[loadStepStyle.row, { opacity: fade }]}>
      <Text style={loadStepStyle.emoji}>{step.emoji}</Text>
      <Text style={loadStepStyle.label}>{step.label}</Text>
    </Animated.View>
  );
}
const loadStepStyle = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginTop: Spacing[4] },
  emoji: { fontSize: 20 },
  label: { fontSize: Typography.sm, color: Colors.textSecondary },
});

// ─── Animated Progress Bar ────────────────────────────────────────────────────

function LoadingProgressBar() {
  const progress = React.useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 0.9,
      duration: 9000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progress]);
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={progressStyle.track}>
      <Animated.View style={[progressStyle.fill, { width }]} />
    </View>
  );
}
const progressStyle = StyleSheet.create({
  track: { width: '100%', height: 4, backgroundColor: Colors.gray200, borderRadius: 2, marginTop: Spacing[6], overflow: 'hidden' },
  fill:  { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
});

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AiTestResult['status'] }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    normal:  { bg: '#16A34A18', text: '#16A34A', label: 'Normal' },
    high:    { bg: '#DC262618', text: '#DC2626', label: '↑ High' },
    low:     { bg: '#2563EB18', text: '#2563EB', label: '↓ Low' },
    unknown: { bg: '#94A3B818', text: '#64748B', label: '?' },
  };
  const c = cfg[status] ?? cfg.unknown;
  return (
    <View style={[statusStyle.badge, { backgroundColor: c.bg }]}>
      <Text style={[statusStyle.label, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}
const statusStyle = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  label: { fontSize: Typography.xs, fontWeight: Typography.bold },
});

// ─── Collapsible Section ──────────────────────────────────────────────────────

function CollapsibleSection({
  emoji, title, color, children, defaultOpen = true,
}: {
  emoji: string; title: string; color: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [chevronAnim] = useState(() => new Animated.Value(defaultOpen ? 1 : 0));

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = !open;
    setOpen(next);
    Animated.timing(chevronAnim, {
      toValue: next ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const chevronRotate = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={[styles.section, { borderColor: color + '30' }]}>
      <Pressable onPress={toggle} style={colStyle.header} android_ripple={{ color: color + '15', borderless: false }}>
        <View style={colStyle.titleRow}>
          <View style={[colStyle.pill, { backgroundColor: color + '18' }]}>
            <Text style={colStyle.emoji}>{emoji}</Text>
          </View>
          <Text style={[colStyle.title, { color }]}>{title}</Text>
        </View>
        <Animated.Text style={[colStyle.chevron, { transform: [{ rotate: chevronRotate }] }]}>▾</Animated.Text>
      </Pressable>
      {open && <View style={colStyle.body}>{children}</View>}
    </View>
  );
}
const colStyle = StyleSheet.create({
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  pill:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emoji:    { fontSize: 18 },
  title:    { fontSize: Typography.base, fontWeight: Typography.bold },
  chevron:  { fontSize: 18, color: Colors.textSecondary, lineHeight: 22 },
  body:     { marginTop: Spacing[3] },
});

// ─── Staggered Section ────────────────────────────────────────────────────────

function StaggeredSection({ children, index }: { children: React.ReactNode; index: number }) {
  const slide = React.useMemo(() => new Animated.Value(40), []);
  const fade  = React.useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const delay = index * 100;
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade,  { toValue: 1, duration: 360, delay, useNativeDriver: true }),
    ]).start();
  }, [slide, fade, index]);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Animated Chat Bubble ─────────────────────────────────────────────────────

function AnimatedBubble({ msg }: { msg: ChatMsg }) {
  const slide = React.useMemo(() => new Animated.Value(24), []);
  const fade  = React.useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 8 }),
      Animated.timing(fade,  { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [slide, fade]);

  return (
    <Animated.View
      style={[
        styles.chatBubble,
        msg.role === 'user' ? styles.userBubble : styles.aiBubble,
        { opacity: fade, transform: [{ translateY: slide }] },
      ]}
    >
      {msg.role === 'ai' && <Text style={styles.chatAiLabel}>🧠 Medora AI</Text>}
      <FormattedAiText
        text={msg.text}
        isUser={msg.role === 'user'}
        style={[styles.chatText, msg.role === 'user' ? styles.userText : styles.aiText]}
      />
    </Animated.View>
  );
}


// ─── Main Modal ───────────────────────────────────────────────────────────────

export function AiReportAnalysisModal({ visible, onClose, report, fileAvailable }: Props) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'result' | 'error'>('idle');
  const [analysis, setAnalysis] = useState<AiReportAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const slideAnim      = React.useMemo(() => new Animated.Value(80), []);
  const fadeAnim       = React.useMemo(() => new Animated.Value(0), []);
  const pulseAnim      = React.useMemo(() => new Animated.Value(1), []);
  const scrollTopOpacity = React.useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (phase === 'loading') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
    return undefined;
  }, [phase, pulseAnim]);

  // Slide-in on result
  useEffect(() => {
    if (phase === 'result') {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(80);
      fadeAnim.setValue(0);
    }
  }, [phase, slideAnim, fadeAnim]);

  const startAnalysis = useCallback(async () => {
    setPhase('loading');
    setAnalysis(null);
    setChat([]);
    try {
      const result = await analyzeReportWithAI(
        report.filePath,
        report.fileType,
        report.title,
        report.category,
        report.cloudinaryUrl,
      );
      setAnalysis(result);
      setPhase('result');
    } catch (e: unknown) {
      console.warn('analyzeReportWithAI failed:', e);
      setErrorMsg(e instanceof Error ? e.message : 'Analysis failed. Please try again.');
      setPhase('error');
    }
  }, [report]);

  // Auto-start when modal opens
  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => {
        void startAnalysis();
      }, 0);
      return () => clearTimeout(t);
    } else {
      // Defer state resets so they don't run synchronously in the effect body
      const t = setTimeout(() => {
        setPhase('idle');
        setAnalysis(null);
        setChat([]);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [visible, startAnalysis]);

  const handleAskQuestion = async () => {
    if (!chatInput.trim() || !analysis) return;
    const q = chatInput.trim();
    setChatInput('');
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', text: q };
    setChat(prev => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const answer = await askFollowUpQuestion(q, analysis);
      const aiMsg: ChatMsg = { id: (Date.now() + 1).toString(), role: 'ai', text: answer };
      setChat(prev => [...prev, aiMsg]);
    } catch {
      const aiMsg: ChatMsg = { id: (Date.now() + 1).toString(), role: 'ai', text: 'Sorry, I could not process that question. Please try again.' };
      setChat(prev => [...prev, aiMsg]);
    } finally {
      setChatLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  };

  const handleScroll = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = e.nativeEvent.contentOffset.y;
    const show = y > 260;
    if (show !== showScrollTop) {
      setShowScrollTop(show);
      Animated.timing(scrollTopOpacity, {
        toValue: show ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleShare = async () => {
    if (!analysis) return;
    const text = [
      `📋 Report Analysis: ${report.title}`,
      `\n🔬 Type: ${analysis.reportType}`,
      `\n📝 Summary:\n${analysis.summary}`,
      analysis.warnings.length > 0
        ? `\n\n⚠️ Warnings:\n${analysis.warnings.map(w => `• ${w}`).join('\n')}`
        : '',
      analysis.keyFindings.length > 0
        ? `\n\n🔍 Key Findings:\n${analysis.keyFindings.map(f => `• ${f}`).join('\n')}`
        : '',
      analysis.recommendations.length > 0
        ? `\n\n✅ Recommendations:\n${analysis.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
        : '',
      `\n\n🤖 Generated by Medora AI`,
    ].join('');
    await Share.share({ message: text, title: `Medora AI: ${report.title}` });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        {/* ─── Gradient Header ─── */}
        <Gradient
          colors={['#1A1A2E', '#16213E', '#0F3460']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerInner}>
            <View style={{ flex: 1 }}>
              <View style={styles.aiPill}>
                <Text style={styles.aiPillText}>✨ Gemini 3.8 Flash</Text>
              </View>
              <Text style={styles.headerTitle}>Report Analysis</Text>
              <Text style={styles.headerSub} numberOfLines={1}>{report.title}</Text>
            </View>
            <View style={styles.headerActions}>
              {phase === 'result' && analysis && (
                <Pressable onPress={handleShare} style={styles.shareBtn} android_ripple={{ color: '#ffffff30', borderless: true, radius: 20 }}>
                  <Text style={styles.shareBtnText}>⬆</Text>
                </Pressable>
              )}
              <CloseButton onPress={onClose} />
            </View>
          </View>
        </Gradient>

        {/* ─── Loading State ─── */}
        {phase === 'loading' && (
          <View style={styles.loadingContainer}>
            <Gradient colors={['#1A1A2E22', '#0F346022']} style={styles.loadingGlow}>
              <Animated.Text style={[styles.brainEmoji, { transform: [{ scale: pulseAnim }] }]}>
                🧠
              </Animated.Text>
            </Gradient>
            <Text style={styles.loadingTitle}>Analyzing with Medora Medical AI…</Text>
            <Text style={styles.loadingSubtitle}>
              Reading your medical document and generating detailed insights.
            </Text>
            <LoadingProgressBar />
            <AnimatedLoadingStep />
            <View style={styles.skeletonStack}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          </View>
        )}

        {/* ─── Error State ─── */}
        {phase === 'error' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorTitle}>Analysis Failed</Text>
            <Text style={styles.errorMsg}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={startAnalysis}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Result State ─── */}
        {phase === 'result' && analysis && (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
            <View style={{ flex: 1 }}>
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={styles.resultContent}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
              <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                {/* 0 — Summary Card */}
                <StaggeredSection index={0}>
                  <Gradient
                    colors={['#1A1A2E', '#0F3460']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.summaryCard}
                  >
                    <View style={styles.summaryHeader}>
                      <View style={styles.reportTypePill}>
                        <Text style={styles.reportTypeText}>{analysis.reportType}</Text>
                      </View>
                      {analysis.patientInfo?.doctorName && (
                        <Text style={styles.doctorLabel}>Dr: {analysis.patientInfo.doctorName}</Text>
                      )}
                    </View>
                    <Text style={styles.summaryText}>{analysis.summary}</Text>
                    {analysis.patientInfo && (
                      <View style={styles.patientRow}>
                        {analysis.patientInfo.name && <Text style={styles.patientChip}>👤 {analysis.patientInfo.name}</Text>}
                        {analysis.patientInfo.age  && <Text style={styles.patientChip}>🎂 {analysis.patientInfo.age}</Text>}
                        {analysis.patientInfo.date && <Text style={styles.patientChip}>📅 {analysis.patientInfo.date}</Text>}
                      </View>
                    )}
                  </Gradient>
                </StaggeredSection>

                {/* 1 — Warnings */}
                {analysis.warnings.length > 0 && (
                  <StaggeredSection index={1}>
                    <CollapsibleSection emoji="⚠️" title="Warnings & Alerts" color="#DC2626">
                      {analysis.warnings.map((w, i) => (
                        <View key={i} style={styles.warningRow}>
                          <Text style={styles.warningDot}>●</Text>
                          <Text style={styles.warningText}>{w}</Text>
                        </View>
                      ))}
                    </CollapsibleSection>
                  </StaggeredSection>
                )}

                {/* 2 — Key Findings */}
                {analysis.keyFindings.length > 0 && (
                  <StaggeredSection index={2}>
                    <CollapsibleSection emoji="🔍" title="Key Findings" color={Colors.primary}>
                      {analysis.keyFindings.map((f, i) => (
                        <View key={i} style={styles.findingRow}>
                          <View style={styles.findingBullet} />
                          <Text style={styles.findingText}>{f}</Text>
                        </View>
                      ))}
                    </CollapsibleSection>
                  </StaggeredSection>
                )}

                {/* 3 — Test Results */}
                {(analysis.testResults?.length ?? 0) > 0 && (
                  <StaggeredSection index={3}>
                    <CollapsibleSection emoji="🩺" title="Test Results" color={Colors.secondary}>
                      <View style={styles.testTable}>
                        <View style={styles.testTableHeader}>
                          <Text style={[styles.testCol, { flex: 2 }]}>Test</Text>
                          <Text style={[styles.testCol, { flex: 1, textAlign: 'center' }]}>Value</Text>
                          <Text style={[styles.testCol, { flex: 1.2, textAlign: 'center' }]}>Normal</Text>
                          <Text style={[styles.testCol, { flex: 0.9, textAlign: 'right' }]}>Status</Text>
                        </View>
                        {analysis.testResults!.map((tr, i) => (
                          <View key={i} style={[styles.testRow, i % 2 === 0 && styles.testRowAlt]}>
                            <Text style={[styles.testName, { flex: 2 }]} numberOfLines={2}>{tr.name}</Text>
                            <Text style={[styles.testValue, { flex: 1, textAlign: 'center' }]}>
                              {tr.value}{tr.unit ? ` ${tr.unit}` : ''}
                            </Text>
                            <Text style={[styles.testNormal, { flex: 1.2, textAlign: 'center' }]}>{tr.normalRange ?? '—'}</Text>
                            <View style={{ flex: 0.9, alignItems: 'flex-end' }}>
                              <StatusBadge status={tr.status} />
                            </View>
                          </View>
                        ))}
                      </View>
                    </CollapsibleSection>
                  </StaggeredSection>
                )}

                {/* 4 — Medicines */}
                {(analysis.medicines?.length ?? 0) > 0 && (
                  <StaggeredSection index={4}>
                    <CollapsibleSection emoji="💊" title="Prescribed Medicines" color="#9B51E0">
                      {analysis.medicines!.map((med: AiMedicineExtracted, i: number) => (
                        <View key={i} style={styles.medCard}>
                          <View style={styles.medCardHeader}>
                            <Text style={styles.medName}>{med.name}</Text>
                            {med.strength && (
                              <View style={styles.medStrengthPill}>
                                <Text style={styles.medStrengthText}>{med.strength}</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.medDetails}>
                            {med.dosage    && <Text style={styles.medDetail}>💊 {med.dosage}</Text>}
                            {med.frequency && <Text style={styles.medDetail}>🔄 {med.frequency}</Text>}
                            {med.duration  && <Text style={styles.medDetail}>⏱ {med.duration}</Text>}
                            {med.notes     && <Text style={[styles.medDetail, { color: Colors.accent }]}>📝 {med.notes}</Text>}
                          </View>
                        </View>
                      ))}
                    </CollapsibleSection>
                  </StaggeredSection>
                )}

                {/* 5 — Recommendations */}
                {analysis.recommendations.length > 0 && (
                  <StaggeredSection index={5}>
                    <CollapsibleSection emoji="✅" title="Recommendations" color={Colors.success}>
                      {analysis.recommendations.map((r, i) => (
                        <View key={i} style={styles.recommendRow}>
                          <Text style={styles.recommendNum}>{i + 1}</Text>
                          <Text style={styles.recommendText}>{r}</Text>
                        </View>
                      ))}
                    </CollapsibleSection>
                  </StaggeredSection>
                )}

                {/* 6 — Disclaimer */}
                <StaggeredSection index={6}>
                  <View style={styles.disclaimerBox}>
                    <Text style={styles.disclaimerIcon}>🤖</Text>
                    <Text style={styles.disclaimerText}>
                      This analysis is generated by Medora AI (Google Gemini Medical AI) and is for informational purposes only.
                      Always consult your doctor or healthcare provider for medical decisions.
                    </Text>
                  </View>
                </StaggeredSection>

                {/* 7 — AI Chat Q&A */}
                <StaggeredSection index={7}>
                  <View style={styles.chatSection}>
                    <Gradient colors={['#1A1A2E', '#0F3460']} style={styles.chatHeader}>
                      <Text style={styles.chatHeaderEmoji}>💬</Text>
                      <View>
                        <Text style={styles.chatHeaderTitle}>Ask Medora AI</Text>
                        <Text style={styles.chatHeaderSub}>Ask anything about this report</Text>
                      </View>
                    </Gradient>

                    {/* Animated chat bubbles */}
                    {chat.map(msg => <AnimatedBubble key={msg.id} msg={msg} />)}

                    {chatLoading && (
                      <View style={[styles.chatBubble, styles.aiBubble]}>
                        <Text style={styles.chatAiLabel}>🧠 Medora AI</Text>
                        <ThinkingDots />
                      </View>
                    )}

                    {chat.length === 0 && (
                      <View style={styles.suggestedRow}>
                        {['What do my results mean?', 'Is anything critical?', 'What should I do next?'].map(q => (
                          <TouchableOpacity key={q} style={styles.suggestedChip} onPress={() => { setChatInput(q); }}>
                            <Text style={styles.suggestedText}>{q}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <View style={styles.chatInputRow}>
                      <TextInput
                        style={styles.chatInput}
                        value={chatInput}
                        onChangeText={setChatInput}
                        placeholder="Ask about this report…"
                        placeholderTextColor={Colors.textSecondary}
                        onSubmitEditing={handleAskQuestion}
                        returnKeyType="send"
                        multiline={false}
                      />
                      <SendButton onPress={handleAskQuestion} disabled={!chatInput.trim() || chatLoading} />
                    </View>
                  </View>
                </StaggeredSection>

                <View style={{ height: 40 }} />
              </Animated.View>
              </ScrollView>

              {/* ─── Floating Scroll-to-Top ─── */}
              <Animated.View
                style={[styles.scrollTopBtn, { opacity: scrollTopOpacity }]}
                pointerEvents={showScrollTop ? 'auto' : 'none'}
              >
                <Pressable
                  onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                  style={styles.scrollTopInner}
                  android_ripple={{ color: '#ffffff30', borderless: true, radius: 22 }}
                >
                  <Text style={styles.scrollTopIcon}>↑</Text>
                </Pressable>
              </Animated.View>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: { paddingTop: Spacing[2], paddingBottom: Spacing[4] },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing[4] },
  aiPill: { backgroundColor: '#ffffff22', paddingHorizontal: Spacing[2], paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start', marginBottom: 6 },
  aiPillText: { color: '#fff', fontSize: Typography.xs, fontWeight: Typography.semibold },
  headerTitle: { color: '#fff', fontSize: Typography['2xl'], fontWeight: Typography.extrabold },
  headerSub:     { color: '#ffffffaa', fontSize: Typography.sm, marginTop: 2 },
  closeBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff20', alignItems: 'center', justifyContent: 'center' },
  closeBtnText:  { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  shareBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff20', alignItems: 'center', justifyContent: 'center' },
  shareBtnText:  { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },

  loadingContainer: { flex: 1, alignItems: 'center', padding: Spacing[6], paddingTop: Spacing[8] },
  loadingGlow:      { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[6] },
  brainEmoji:       { fontSize: 64 },
  loadingTitle:     { fontSize: Typography.xl, fontWeight: Typography.extrabold, color: Colors.textPrimary, textAlign: 'center' },
  loadingSubtitle:  { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing[2], lineHeight: 20 },
  skeletonStack:    { width: '100%', gap: Spacing[3], marginTop: Spacing[5] },

  // Error
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing[6] },
  errorEmoji: { fontSize: 56, marginBottom: Spacing[4] },
  errorTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing[2] },
  errorMsg: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: Spacing[6], backgroundColor: Colors.primary, paddingHorizontal: Spacing[6], paddingVertical: Spacing[3], borderRadius: Radius.full },
  retryBtnText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.base },

  // Result
  resultContent: { padding: Spacing[4], gap: Spacing[4] },

  // Summary Card
  summaryCard: { borderRadius: Radius.xl, padding: Spacing[4], gap: Spacing[3], ...Shadows.md },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportTypePill: { backgroundColor: '#ffffff22', paddingHorizontal: Spacing[3], paddingVertical: 4, borderRadius: Radius.full },
  reportTypeText: { color: '#fff', fontSize: Typography.sm, fontWeight: Typography.semibold },
  doctorLabel: { color: '#ffffffaa', fontSize: Typography.xs },
  summaryText: { color: '#fff', fontSize: Typography.base, lineHeight: 22, fontWeight: Typography.regular },
  patientRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  patientChip: { backgroundColor: '#ffffff18', color: '#ffffffcc', fontSize: Typography.xs, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },

  // Sections
  section: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing[4], ...Shadows.sm, borderWidth: 1, borderColor: Colors.border },

  // Warnings
  warningRow: { flexDirection: 'row', gap: Spacing[2], alignItems: 'flex-start', marginBottom: Spacing[2] },
  warningDot: { color: '#DC2626', fontSize: 10, marginTop: 4 },
  warningText: { flex: 1, fontSize: Typography.sm, color: '#DC2626', lineHeight: 20 },

  // Key Findings
  findingRow: { flexDirection: 'row', gap: Spacing[2], alignItems: 'flex-start', marginBottom: Spacing[2] },
  findingBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 7 },
  findingText: { flex: 1, fontSize: Typography.sm, color: Colors.textPrimary, lineHeight: 20 },

  // Test Table
  testTable: { gap: 2 },
  testTableHeader: { flexDirection: 'row', paddingBottom: Spacing[2], borderBottomWidth: 1, borderBottomColor: Colors.border },
  testCol: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textSecondary, textTransform: 'uppercase' },
  testRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[2] },
  testRowAlt: { backgroundColor: Colors.gray50, borderRadius: Radius.sm },
  testName: { fontSize: Typography.sm, color: Colors.textPrimary, fontWeight: Typography.medium },
  testValue: { fontSize: Typography.sm, color: Colors.textPrimary, fontWeight: Typography.semibold },
  testNormal: { fontSize: Typography.xs, color: Colors.textSecondary },

  // Medicines
  medCard: { backgroundColor: Colors.gray50, borderRadius: Radius.lg, padding: Spacing[3], marginBottom: Spacing[2], borderWidth: 1, borderColor: '#9B51E020' },
  medCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginBottom: Spacing[2] },
  medName: { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.textPrimary, flex: 1 },
  medStrengthPill: { backgroundColor: '#9B51E018', paddingHorizontal: 10, paddingVertical: 2, borderRadius: Radius.full },
  medStrengthText: { fontSize: Typography.xs, color: '#9B51E0', fontWeight: Typography.semibold },
  medDetails: { gap: 4 },
  medDetail: { fontSize: Typography.sm, color: Colors.textSecondary },

  // Recommendations
  recommendRow: { flexDirection: 'row', gap: Spacing[3], alignItems: 'flex-start', marginBottom: Spacing[2] },
  recommendNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.successLight, color: Colors.success, fontSize: Typography.xs, fontWeight: Typography.bold, textAlign: 'center', lineHeight: 24 },
  recommendText: { flex: 1, fontSize: Typography.sm, color: Colors.textPrimary, lineHeight: 20 },

  // Disclaimer
  disclaimerBox: { flexDirection: 'row', backgroundColor: Colors.accentLight, borderRadius: Radius.lg, padding: Spacing[3], gap: Spacing[2], alignItems: 'flex-start' },
  disclaimerIcon: { fontSize: 20 },
  disclaimerText: { flex: 1, fontSize: Typography.xs, color: Colors.textSecondary, lineHeight: 18 },

  // Chat
  chatSection: { gap: Spacing[3] },
  chatHeader: { borderRadius: Radius.xl, padding: Spacing[4], flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  chatHeaderEmoji: { fontSize: 36 },
  chatHeaderTitle: { color: '#fff', fontSize: Typography.lg, fontWeight: Typography.bold },
  chatHeaderSub: { color: '#ffffffaa', fontSize: Typography.xs },

  chatBubble: { borderRadius: Radius.xl, padding: Spacing[3], maxWidth: '90%', ...Shadows.sm },
  userBubble: { backgroundColor: Colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: Colors.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  chatAiLabel: { fontSize: Typography.xs, color: Colors.primary, fontWeight: Typography.semibold, marginBottom: 4 },
  chatText: { fontSize: Typography.sm, lineHeight: 20 },
  userText: { color: '#fff' },
  aiText: { color: Colors.textPrimary },

  suggestedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  suggestedChip: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary + '40' },
  suggestedText: { fontSize: Typography.xs, color: Colors.primary, fontWeight: Typography.medium },

  chatInputRow: { flexDirection: 'row', gap: Spacing[2], alignItems: 'center' },
  chatInput: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], fontSize: Typography.sm, color: Colors.textPrimary, borderWidth: 1.5, borderColor: Colors.border },
  sendBtn: { borderRadius: 24 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnGradient: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },

  // Scroll to Top
  scrollTopBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    ...Shadows.md,
    zIndex: 99,
  },
  scrollTopInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollTopIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: Typography.bold,
  },
});
