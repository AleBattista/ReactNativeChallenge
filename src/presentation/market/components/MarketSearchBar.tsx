import React, { memo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../../../core/theme/ThemeProvider';
import { formatQuantity } from '../../../core/utils/formatters';
import { AppText } from '../../shared/components/AppText';

export interface MarketSearchBarProps {
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly onClear: () => void;
  readonly resultCount: number;
  readonly totalCount: number;
}

/**
 * Barra de búsqueda instantánea en memoria por símbolo o descripción.
 */
export const MarketSearchBar = memo(function MarketSearchBarBase({
  value,
  onChangeText,
  onClear,
  resultCount,
  totalCount,
}: MarketSearchBarProps) {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          gap: spacing.xs,
        },
      ]}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderRadius: radii.md,
            paddingHorizontal: spacing.md,
          },
        ]}>
        <AppText variant="body" color="textMuted" style={styles.searchIcon}>
          ⌕
        </AppText>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Buscar por símbolo o descripción (ej. ALUA, GGAL)..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          clearButtonMode="never"
          returnKeyType="search"
          accessibilityLabel="Buscar activo por símbolo o descripción"
          style={[
            styles.input,
            typography.body,
            { color: colors.textPrimary, paddingVertical: spacing.sm },
          ]}
        />
        {value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpiar búsqueda"
            hitSlop={8}
            onPress={onClear}
            style={[styles.clearButton, { paddingHorizontal: spacing.xs }]}>
            <AppText variant="bodyStrong" color="textSecondary">
              ✕
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <AppText variant="caption" color="textSecondary" style={styles.tabular}>
          {`${formatQuantity(resultCount)} de ${formatQuantity(totalCount)} activos`}
        </AppText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
  },
  clearButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});

export default MarketSearchBar;

