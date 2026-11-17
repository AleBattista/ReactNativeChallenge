import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../../core/theme/ThemeProvider';
import { formatPercent } from '../../../core/utils/formatters';
import { getTrend } from '../../../domain/market/entities/Quote';
import { AppText } from './AppText';

export interface ChangeBadgeProps {
  /** Puntos porcentuales (ej. -0.54). */
  readonly value: number | null;
}

/**
 * Componente presentacional puro: recibe un primitivo y lo pinta.
 * Al recibir un primitivo, `memo` corta re-renders si el valor no cambió.
 */
export const ChangeBadge = memo(function ChangeBadgeBase({
  value,
}: ChangeBadgeProps) {
  const { colors, spacing, radii } = useTheme();
  const trend = getTrend(value);

  const tone = {
    up: { fg: 'positive', bg: colors.positiveSoft },
    down: { fg: 'negative', bg: colors.negativeSoft },
    flat: { fg: 'neutral', bg: colors.neutralSoft },
  } as const;

  const label = formatPercent(value);

  return (
    <View
      accessibilityLabel={`Variación ${label}`}
      style={[
        styles.base,
        {
          backgroundColor: tone[trend].bg,
          borderRadius: radii.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
        },
      ]}>
      <AppText variant="price" color={tone[trend].fg}>
        {label}
      </AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  base: { alignSelf: 'flex-start' },
});

export default ChangeBadge;
