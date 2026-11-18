import React, { memo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../../../core/theme/ThemeProvider';
import { formatQuantity } from '../../../core/utils/formatters';
import { AppText } from '../../shared/components/AppText';
import {
  formatSortBadgeLabel,
  type MarketSortConfig,
} from './MarketSortSheet';

export interface MarketSearchBarProps {
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly onClear: () => void;
  readonly resultCount: number;
  readonly totalCount: number;
  readonly sortConfig?: MarketSortConfig | null;
  readonly onPressSort?: () => void;
}

/**
 * Barra de búsqueda instantánea en memoria por símbolo o descripción,
 * con botón de acceso directo al Bottom Sheet de Ordenamiento.
 */
export const MarketSearchBar = memo(function MarketSearchBarBase({
  value,
  onChangeText,
  onClear,
  resultCount,
  totalCount,
  sortConfig = null,
  onPressSort,
}: MarketSearchBarProps) {
  const { colors, spacing, radii, typography } = useTheme();
  const hasActiveSort = sortConfig !== null;
  const sortLabel = formatSortBadgeLabel(sortConfig);

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

        {onPressSort ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ordenar activos, actual: ${sortLabel}`}
            hitSlop={8}
            onPress={onPressSort}
            style={({ pressed }) => [
              styles.sortButton,
              {
                backgroundColor: hasActiveSort
                  ? colors.accent
                  : colors.background,
                borderColor: hasActiveSort ? colors.accent : colors.border,
                borderRadius: radii.sm,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xxs,
                opacity: pressed ? 0.82 : 1,
              },
            ]}>
            <AppText
              variant="caption"
              color={hasActiveSort ? 'onAccent' : 'textSecondary'}
              style={styles.sortButtonText}>
              {sortLabel}
            </AppText>
          </Pressable>
        ) : null}
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
    marginTop: 6,
  },
  sortButton: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButtonText: {
    fontWeight: '600',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});

export default MarketSearchBar;
