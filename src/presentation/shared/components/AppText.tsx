import React, { memo } from 'react';
import { Text, type TextProps } from 'react-native';
import { useTheme } from '../../../core/theme/ThemeProvider';
import type { ThemeColors } from '../../../core/theme/themes';
import type { TypographyVariant } from '../../../core/theme/tokens';

type TextColor = keyof Pick<
  ThemeColors,
  | 'textPrimary'
  | 'textSecondary'
  | 'textMuted'
  | 'positive'
  | 'negative'
  | 'neutral'
  | 'accent'
  | 'onAccent'
>;

export interface AppTextProps extends TextProps {
  readonly variant?: TypographyVariant;
  readonly color?: TextColor;
}

/** Único punto de tipografía de la app: nunca usar <Text> de RN directo. */
export const AppText = memo(function AppTextBase({
  variant = 'body',
  color = 'textPrimary',
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[theme.typography[variant], { color: theme.colors[color] }, style]}
    />
  );
});

export default AppText;
