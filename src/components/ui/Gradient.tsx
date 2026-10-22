import { View, ViewProps, Platform } from 'react-native';
import { LinearGradient as ExpoLinearGradient, LinearGradientProps } from 'expo-linear-gradient';

export type GradientProps = LinearGradientProps & ViewProps;

/**
 * Universal Gradient component that safely wraps expo-linear-gradient
 * with graceful fallback for web environments.
 */
export function Gradient({ colors, style, children, start, end, ...rest }: GradientProps) {
  if (Platform.OS === 'web') {
    const getCoord = (p: unknown, axis: 'x' | 'y'): number => {
      if (!p) return axis === 'x' ? 0 : 0;
      if (Array.isArray(p)) return axis === 'x' ? p[0] : p[1];
      if (typeof p === 'object' && p !== null) {
        return (p as Record<string, number>)[axis] ?? 0;
      }
      return 0;
    };
    const startX = getCoord(start, 'x');
    const startY = getCoord(start, 'y');
    const endX = end ? getCoord(end, 'x') : 1;
    const endY = end ? getCoord(end, 'y') : 1;
    const angle = Math.round((Math.atan2(endY - startY, endX - startX) * 180) / Math.PI + 90);
    const background = `linear-gradient(${angle}deg, ${colors.join(', ')})`;

    return (
      <View
        // @ts-expect-error web style background support
        style={[{ backgroundImage: background, backgroundColor: colors[0] }, style]}
        {...rest}
      >
        {children}
      </View>
    );
  }

  return (
    <ExpoLinearGradient colors={colors} start={start} end={end} style={style} {...rest}>
      {children}
    </ExpoLinearGradient>
  );
}

export default Gradient;
