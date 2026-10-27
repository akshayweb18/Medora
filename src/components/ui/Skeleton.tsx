import React, { useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

const SHIMMER_COLOR_FROM = Colors.gray100;
const SHIMMER_COLOR_TO   = Colors.gray200;

// ─── Base shimmer box ─────────────────────────────────────────────────────────
interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: object;
}

export function SkeletonBox({ width = '100%', height = 16, radius = Radius.md, style }: SkeletonBoxProps) {
  const anim = React.useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const bg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [SHIMMER_COLOR_FROM, SHIMMER_COLOR_TO],
  });

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: bg }, style]}
    />
  );
}

// ─── Home skeleton ────────────────────────────────────────────────────────────
export function HomeSkeleton() {
  return (
    <View style={s.screen}>
      <View style={s.header}>
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBox width="55%" height={22} radius={8} />
          <SkeletonBox width="38%" height={13} radius={6} />
        </View>
        <SkeletonBox width={44} height={44} radius={22} />
      </View>
      <View style={s.statsRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={s.statCard}>
            <SkeletonBox width={32} height={28} radius={6} />
            <SkeletonBox width="70%" height={11} radius={4} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
      <SkeletonBox width="100%" height={90} radius={Radius.xl} style={{ marginBottom: 20 }} />
      <SkeletonBox width="40%" height={16} radius={6} style={{ marginBottom: 12 }} />
      {[0, 1, 2].map(i => (
        <View key={i} style={s.listRow}>
          <SkeletonBox width={44} height={44} radius={12} />
          <View style={{ flex: 1, gap: 7, marginLeft: 12 }}>
            <SkeletonBox width="60%" height={14} radius={5} />
            <SkeletonBox width="38%" height={11} radius={4} />
          </View>
          <SkeletonBox width={64} height={30} radius={Radius.full} />
        </View>
      ))}
      <SkeletonBox width="35%" height={16} radius={6} style={{ marginTop: 24, marginBottom: 12 }} />
      {[0, 1].map(i => (
        <View key={i} style={s.listRow}>
          <SkeletonBox width={40} height={40} radius={10} />
          <View style={{ flex: 1, gap: 7, marginLeft: 12 }}>
            <SkeletonBox width="65%" height={14} radius={5} />
            <SkeletonBox width="42%" height={11} radius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Medicines skeleton ───────────────────────────────────────────────────────
export function MedicinesSkeleton() {
  return (
    <View style={s.screen}>
      <View style={s.header}>
        <SkeletonBox width="45%" height={22} radius={8} />
        <SkeletonBox width={72} height={34} radius={Radius.full} />
      </View>
      <SkeletonBox width="100%" height={44} radius={Radius.lg} style={{ marginBottom: 16 }} />
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <SkeletonBox width={48} height={48} radius={12} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonBox width="55%" height={15} radius={5} />
              <SkeletonBox width="38%" height={12} radius={4} />
            </View>
            <SkeletonBox width={56} height={24} radius={Radius.full} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {[72, 72, 72].map((w, j) => (
              <SkeletonBox key={j} width={w} height={28} radius={Radius.full} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Reports skeleton ─────────────────────────────────────────────────────────
export function ReportsSkeleton() {
  return (
    <View style={s.screen}>
      <View style={s.header}>
        <SkeletonBox width="40%" height={22} radius={8} />
        <SkeletonBox width={80} height={34} radius={Radius.full} />
      </View>
      <SkeletonBox width="100%" height={72} radius={Radius.xl} style={{ marginBottom: 14 }} />
      <SkeletonBox width="100%" height={44} radius={Radius.lg} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[70, 80, 60, 90].map((w, i) => (
          <SkeletonBox key={i} width={w} height={32} radius={Radius.full} />
        ))}
      </View>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={s.card}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <SkeletonBox width={46} height={46} radius={12} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonBox width="65%" height={14} radius={5} />
              <SkeletonBox width="40%" height={11} radius={4} />
            </View>
            <SkeletonBox width={36} height={36} radius={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── AI skeleton ──────────────────────────────────────────────────────────────
export function AISkeleton() {
  return (
    <View style={s.screen}>
      <View style={{ gap: 6, marginBottom: 20 }}>
        <SkeletonBox width="50%" height={24} radius={8} />
        <SkeletonBox width="70%" height={13} radius={5} />
      </View>
      <SkeletonBox width="100%" height={130} radius={Radius.xl} style={{ marginBottom: 20 }} />
      <SkeletonBox width="38%" height={16} radius={6} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        {[120, 100, 140, 110, 130].map((w, i) => (
          <SkeletonBox key={i} width={w} height={38} radius={Radius.full} />
        ))}
      </View>
      <SkeletonBox width="32%" height={14} radius={5} style={{ marginBottom: 12 }} />
      <SkeletonBox width="100%" height={56} radius={Radius.lg} style={{ marginBottom: 10 }} />
      <SkeletonBox width="80%" height={44} radius={Radius.lg} style={{ marginBottom: 10, alignSelf: 'flex-end' }} />
      <SkeletonBox width="100%" height={72} radius={Radius.lg} />
    </View>
  );
}

// ─── Profile skeleton ─────────────────────────────────────────────────────────
export function ProfileSkeleton() {
  return (
    <View style={s.screen}>
      <View style={s.profileHeader}>
        <SkeletonBox width={80} height={80} radius={40} />
        <View style={{ gap: 10, marginTop: 12, alignItems: 'center' }}>
          <SkeletonBox width={140} height={18} radius={7} />
          <SkeletonBox width={100} height={13} radius={5} />
        </View>
      </View>
      <SkeletonBox width="38%" height={16} radius={6} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
        {[0, 1, 2].map(i => (
          <SkeletonBox key={i} width={80} height={80} radius={16} />
        ))}
      </View>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <View key={i} style={s.menuRow}>
          <SkeletonBox width={36} height={36} radius={10} />
          <SkeletonBox width="55%" height={14} radius={5} style={{ marginLeft: 12 }} />
          <SkeletonBox width={20} height={20} radius={4} style={{ marginLeft: 'auto' }} />
        </View>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[5],
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginBottom: Spacing[5],
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    alignItems: 'center',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing[3],
    marginBottom: Spacing[3],
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Spacing[6],
    marginBottom: Spacing[4],
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[2],
  },
});

// ─── Generic list skeleton (for history, health, family, detail pages) ────────
export function GenericListSkeleton() {
  return (
    <View style={s.screen}>
      {/* Header row */}
      <View style={s.header}>
        <View style={{ gap: 8, flex: 1 }}>
          <SkeletonBox width="48%" height={22} radius={8} />
        </View>
        <SkeletonBox width={80} height={34} radius={Radius.full} />
      </View>
      {/* List items */}
      {[0, 1, 2, 3, 4, 5].map(i => (
        <View key={i} style={s.listRow}>
          <SkeletonBox width={44} height={44} radius={12} />
          <View style={{ flex: 1, gap: 8, marginLeft: 12 }}>
            <SkeletonBox width="62%" height={14} radius={5} />
            <SkeletonBox width="40%" height={11} radius={4} />
          </View>
          <SkeletonBox width={28} height={28} radius={8} />
        </View>
      ))}
    </View>
  );
}

// ─── Detail page skeleton ─────────────────────────────────────────────────────
export function DetailSkeleton() {
  return (
    <View style={s.screen}>
      {/* Back button */}
      <SkeletonBox width={80} height={32} radius={Radius.full} style={{ marginBottom: 20 }} />
      {/* Title area */}
      <View style={{ gap: 10, marginBottom: 24 }}>
        <SkeletonBox width="70%" height={26} radius={8} />
        <SkeletonBox width="45%" height={14} radius={5} />
      </View>
      {/* Content blocks */}
      <SkeletonBox width="100%" height={120} radius={Radius.xl} style={{ marginBottom: 16 }} />
      <SkeletonBox width="100%" height={80} radius={Radius.xl} style={{ marginBottom: 16 }} />
      {[0, 1, 2].map(i => (
        <View key={i} style={s.listRow}>
          <SkeletonBox width={36} height={36} radius={10} />
          <View style={{ flex: 1, gap: 8, marginLeft: 12 }}>
            <SkeletonBox width="60%" height={14} radius={5} />
            <SkeletonBox width="38%" height={11} radius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}
