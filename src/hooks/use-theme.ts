/**
 * useTheme — returns the MediVault design tokens.
 * Always returns light-mode tokens (MediVault is light-mode only).
 */
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';

export function useTheme() {
  return { colors: Colors, typography: Typography, spacing: Spacing, radius: Radius, shadows: Shadows };
}
