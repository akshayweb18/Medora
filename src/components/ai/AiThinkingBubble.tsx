/**
 * AiThinkingBubble — Professional animated AI loading indicator
 * Features:
 * - Pulsing avatar badge
 * - 3-dot staggered wave bounce in brand primary color
 * - Progressive rotating clinical status text
 * - Shimmering placeholder lines showing incoming content shape
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

const STATUS_STAGES = [
  'Reading your health question…',
  'Consulting clinical database…',
  'Reviewing medication & lab guidelines…',
  'Formulating doctor-grade explanation…',
];

export function AiThinkingBubble() {
  const [stageIndex, setStageIndex] = useState(0);

  // Dots bounce animations (useMemo satisfies react-hooks/refs)
  const dot1 = React.useMemo(() => new Animated.Value(0), []);
  const dot2 = React.useMemo(() => new Animated.Value(0), []);
  const dot3 = React.useMemo(() => new Animated.Value(0), []);

  // Pulse animation for avatar & shimmer
  const pulseAnim = React.useMemo(() => new Animated.Value(0), []);
  // Status text fade animation
  const textFadeAnim = React.useMemo(() => new Animated.Value(1), []);

  // 1. Staggered Wave Dots
  useEffect(() => {
    const createDotAnim = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(Math.max(0, 600 - delay)),
        ])
      );
    };

    const a1 = createDotAnim(dot1, 0);
    const a2 = createDotAnim(dot2, 200);
    const a3 = createDotAnim(dot3, 400);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  // 2. Pulse / Shimmer loop
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // 3. Rotating status text
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(textFadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setStageIndex(prev => (prev + 1) % STATUS_STAGES.length);
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    }, 2200);

    return () => clearInterval(interval);
  }, [textFadeAnim]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
        }),
      },
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 1.15],
        }),
      },
    ],
  });

  const shimmerBg = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.gray100, Colors.gray200],
  });

  const avatarScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <View style={styles.container}>
      {/* Animated AI Avatar */}
      <Animated.View style={[styles.avatar, { transform: [{ scale: avatarScale }] }]}>
        <Text style={styles.avatarText}>✨</Text>
      </Animated.View>

      {/* Bubble Container */}
      <View style={styles.bubble}>
        {/* Top Header with Wave Dots & Status */}
        <View style={styles.headerRow}>
          <View style={styles.dotsRow}>
            <Animated.View style={[styles.dot, dotStyle(dot1)]} />
            <Animated.View style={[styles.dot, dotStyle(dot2)]} />
            <Animated.View style={[styles.dot, dotStyle(dot3)]} />
          </View>
          <Animated.Text style={[styles.statusText, { opacity: textFadeAnim }]}>
            {STATUS_STAGES[stageIndex]}
          </Animated.Text>
        </View>

        {/* Shimmer Placeholder Lines */}
        <View style={styles.skeletonContainer}>
          <Animated.View style={[styles.skeletonLine, { width: '92%', backgroundColor: shimmerBg }]} />
          <Animated.View style={[styles.skeletonLine, { width: '78%', backgroundColor: shimmerBg }]} />
          <Animated.View style={[styles.skeletonLine, { width: '45%', backgroundColor: shimmerBg }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
    marginVertical: Spacing[2],
    paddingHorizontal: Spacing[1],
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderWidth: 1.5,
    borderColor: '#0F3460',
    ...Shadows.sm,
  },
  avatarText: {
    fontSize: 15,
  },
  bubble: {
    maxWidth: '84%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderBottomLeftRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3] + 2,
    paddingVertical: Spacing[3],
    ...Shadows.sm,
    gap: Spacing[2] + 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 16,
    paddingHorizontal: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  statusText: {
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: Typography.medium,
    fontStyle: 'italic',
    flexShrink: 1,
  },
  skeletonContainer: {
    gap: 6,
    paddingTop: 2,
  },
  skeletonLine: {
    height: 11,
    borderRadius: 6,
  },
});
