import React from 'react';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { Colors } from '@/constants/theme';
import Svg, { Path } from 'react-native-svg';

interface BackButtonProps {
  onPress: () => void;
  /** Color of the chevron icon. Defaults to Colors.primary */
  color?: string;
}

function ChevronLeft({ color = Colors.primary }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18L9 12L15 6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BackButton({ onPress, color }: BackButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.btn}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={styles.circle}>
        <ChevronLeft color={color ?? Colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    padding: 2,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
});
