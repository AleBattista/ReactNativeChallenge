import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../../core/theme/ThemeProvider';
import { AppText } from './AppText';

export interface ScreenHeaderTitleProps {
  readonly title: string;
  readonly subtitle?: string;
}

/**
 * Encabezado corporativo para las pantallas principales ("Mercado", "Favoritos", "Órdenes"):
 *  - Incorpora una barra vertical decorativa en color de acento primario (`colors.accent`).
 *  - Estructura jerárquica con título destacado y subtítulo de contexto estilizado.
 */
export const ScreenHeaderTitle = memo(function ScreenHeaderTitleBase({
  title,
  subtitle,
}: ScreenHeaderTitleProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { gap: spacing.sm }]}>
      <View
        style={[
          styles.accentBar,
          {
            backgroundColor: colors.accent,
          },
        ]}
      />
      <View style={styles.textColumn}>
        <AppText variant="title" numberOfLines={1} style={styles.titleText}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText
            variant="caption"
            color="textMuted"
            numberOfLines={1}
            style={styles.subtitleText}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accentBar: {
    width: 4,
    height: 22,
    borderRadius: 2,
  },
  textColumn: {
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 11,
    lineHeight: 14,
  },
});

export default ScreenHeaderTitle;
