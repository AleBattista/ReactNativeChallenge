import React, { memo } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '../../../core/theme/ThemeProvider';
import type { Spacing } from '../../../core/theme/tokens';

export interface CardProps extends ViewProps {
  readonly padding?: Spacing;
  readonly elevated?: boolean;
}

export const Card = memo(function CardBase({
  padding = 'lg',
  elevated = false,
  style,
  ...rest
}: CardProps) {
  const { colors, spacing, radii } = useTheme();
  return (
    <View
      {...rest}
      style={[
        styles.base,
        {
          backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
          borderColor: colors.border,
          borderRadius: radii.md,
          padding: spacing[padding],
        },
        style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  base: { borderWidth: StyleSheet.hairlineWidth },
});

export default Card;
