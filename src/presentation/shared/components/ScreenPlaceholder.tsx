import React, { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../../../core/theme/ThemeProvider';
import { AppText } from './AppText';
import { Card } from './Card';

export interface DependencyCheck {
  readonly label: string;
  readonly resolved: boolean;
}

export interface ScreenPlaceholderProps {
  readonly title: string;
  readonly subtitle?: string;
  /** Dependencias inyectadas que la pantalla consumirá; se muestran como diagnóstico. */
  readonly checks: readonly DependencyCheck[];
  readonly children?: ReactNode;
}

/**
 * Esqueleto base de pantalla. Muestra el nombre en grande, usa solo tokens del
 * tema (Dark/Light) y expone el estado de la inyección de dependencias.
 */
export function ScreenPlaceholder({
  title,
  subtitle,
  checks,
  children,
}: ScreenPlaceholderProps) {
  const { colors, spacing } = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { padding: spacing.xl, gap: spacing.lg },
      ]}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="display" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? <AppText color="textSecondary">{subtitle}</AppText> : null}
      </View>

      <Card style={{ gap: spacing.sm }}>
        <AppText variant="bodyStrong">Inyección de dependencias</AppText>
        {checks.map(check => (
          <View key={check.label} style={styles.row}>
            <AppText variant="caption" color="textSecondary">
              {check.label}
            </AppText>
            <AppText
              variant="caption"
              color={check.resolved ? 'positive' : 'negative'}>
              {check.resolved ? '✓ resuelta' : '✗ faltante'}
            </AppText>
          </View>
        ))}
      </Card>

      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});

export default ScreenPlaceholder;
