import React, { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../../core/theme/ThemeProvider';
import { AppText } from './AppText';

export interface AppButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: 'primary' | 'secondary';
  readonly accessibilityHint?: string;
}

export const AppButton = memo(function AppButtonBase({
  label,
  onPress,
  variant = 'primary',
  accessibilityHint,
}: AppButtonProps) {
  const { colors, spacing, radii } = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isPrimary ? colors.accent : colors.surface,
          borderColor: isPrimary ? colors.accent : colors.border,
          borderRadius: radii.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <AppText
        variant="bodyStrong"
        color={isPrimary ? 'onAccent' : 'textPrimary'}>
        {label}
      </AppText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: { alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
});

export default AppButton;
