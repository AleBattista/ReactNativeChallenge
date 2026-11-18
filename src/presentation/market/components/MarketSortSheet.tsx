import React, { memo, useCallback } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../core/theme/ThemeProvider';
import type { Quote } from '../../../domain/market';
import type { Ticker } from '../../../domain/shared';
import { AppText } from '../../shared/components/AppText';

export type MarketSortField = 'symbol' | 'changePercent' | 'tradedAmount';
export type MarketSortDirection = 'asc' | 'desc';

export interface MarketSortConfig {
  readonly field: MarketSortField;
  readonly direction: MarketSortDirection;
}

export interface MarketSortSheetProps {
  readonly visible: boolean;
  readonly currentSort: MarketSortConfig | null;
  readonly onApplySort: (sort: MarketSortConfig | null) => void;
  readonly onClose: () => void;
}

const TRANSPARENT_COLOR = 'transparent';

/**
 * Ordena de forma imperativa un arreglo de `Ticker` ya filtrado según el
 * criterio y dirección indicados, leyendo una instantánea de `getQuote`.
 *
 * No muta el arreglo de entrada.
 */
export const sortMarketTickers = (
  tickers: readonly Ticker[],
  sort: MarketSortConfig | null,
  getQuote: (symbol: Ticker) => Quote | undefined,
): readonly Ticker[] => {
  if (!sort || tickers.length <= 1) {
    return tickers;
  }

  const factor = sort.direction === 'asc' ? 1 : -1;
  const copy = [...tickers];

  if (sort.field === 'symbol') {
    copy.sort((a, b) => a.localeCompare(b) * factor);
    return copy;
  }

  copy.sort((a, b) => {
    const quoteA = getQuote(a);
    const quoteB = getQuote(b);

    const rawA =
      sort.field === 'changePercent'
        ? quoteA?.changePercent ?? null
        : quoteA?.tradedAmount ?? null;
    const rawB =
      sort.field === 'changePercent'
        ? quoteB?.changePercent ?? null
        : quoteB?.tradedAmount ?? null;

    // Los valores nulos siempre quedan al final sin importar la dirección
    if (rawA === null && rawB === null) {
      return a.localeCompare(b);
    }
    if (rawA === null) {
      return 1;
    }
    if (rawB === null) {
      return -1;
    }
    if (rawA === rawB) {
      return a.localeCompare(b);
    }
    return (rawA - rawB) * factor;
  });

  return copy;
};

/** Etiqueta resumida para mostrar en el botón de ordenamiento de la barra de búsqueda. */
export const formatSortBadgeLabel = (sort: MarketSortConfig | null): string => {
  if (!sort) {
    return '⇅ Ordenar';
  }
  const arrow = sort.direction === 'asc' ? '↑' : '↓';
  switch (sort.field) {
    case 'symbol':
      return `Símbolo ${arrow}`;
    case 'changePercent':
      return `Variación ${arrow}`;
    case 'tradedAmount':
      return `Monto ${arrow}`;
  }
};

interface SortCriterionGroup {
  readonly field: MarketSortField;
  readonly title: string;
  readonly subtitle: string;
  readonly ascLabel: string;
  readonly descLabel: string;
}

const SORT_CRITERIA: readonly SortCriterionGroup[] = [
  {
    field: 'symbol',
    title: 'Símbolo (Ticker)',
    subtitle: 'Orden alfabético por código de especie',
    ascLabel: '↑ A – Z',
    descLabel: '↓ Z – A',
  },
  {
    field: 'changePercent',
    title: 'Variación Diaria (%)',
    subtitle: 'Rendimiento porcentual en la rueda actual',
    ascLabel: '↑ Menor a mayor',
    descLabel: '↓ Mayor a menor',
  },
  {
    field: 'tradedAmount',
    title: 'Monto Operado ($)',
    subtitle: 'Volumen efectivo negociado en pesos',
    ascLabel: '↑ Menor monto',
    descLabel: '↓ Mayor monto',
  },
];

/**
 * Bottom Sheet de Ordenamiento (`MarketSortSheet`):
 *  - Panel inferior flotante con bordes superiores redondeados y fondo semitransparente.
 *  - Permite elegir criterio (`symbol`, `changePercent`, `tradedAmount`) y sentido (`asc` / `desc`),
 *    o limpiar el ordenamiento para volver al orden por defecto.
 */
export const MarketSortSheet = memo(function MarketSortSheetBase({
  visible,
  currentSort,
  onApplySort,
  onClose,
}: MarketSortSheetProps) {
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();

  const handleSelectOption = useCallback(
    (field: MarketSortField, direction: MarketSortDirection) => {
      onApplySort({ field, direction });
      onClose();
    },
    [onApplySort, onClose],
  );

  const handleClearSort = useCallback(() => {
    onApplySort(null);
    onClose();
  }, [onApplySort, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar panel de ordenamiento"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              gap: spacing.md,
            },
          ]}>
          {/* Indicador superior tipo handle */}
          <View style={styles.handleRow}>
            <View
              style={[styles.handleBar, { backgroundColor: colors.border }]}
            />
          </View>

          <View style={styles.headerRow}>
            <View>
              <AppText variant="title">Ordenar activos</AppText>
              <AppText variant="caption" color="textSecondary">
                Se aplica sobre los resultados filtrados en pantalla
              </AppText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderRadius: radii.pill,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}>
              <AppText variant="bodyStrong" color="textSecondary">
                ✕
              </AppText>
            </Pressable>
          </View>

          <View style={{ gap: spacing.md }}>
            {SORT_CRITERIA.map(group => {
              const isAscActive =
                currentSort?.field === group.field &&
                currentSort.direction === 'asc';
              const isDescActive =
                currentSort?.field === group.field &&
                currentSort.direction === 'desc';

              return (
                <View
                  key={group.field}
                  style={[
                    styles.criterionCard,
                    {
                      backgroundColor: colors.background,
                      borderColor:
                        isAscActive || isDescActive
                          ? colors.accent
                          : colors.border,
                      borderRadius: radii.md,
                      padding: spacing.md,
                      gap: spacing.sm,
                    },
                  ]}>
                  <View>
                    <AppText variant="bodyStrong">{group.title}</AppText>
                    <AppText variant="caption" color="textMuted">
                      {group.subtitle}
                    </AppText>
                  </View>

                  <View style={[styles.directionRow, { gap: spacing.sm }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isAscActive }}
                      accessibilityLabel={`${group.title} ${group.ascLabel}`}
                      onPress={() => handleSelectOption(group.field, 'asc')}
                      style={({ pressed }) => [
                        styles.directionPill,
                        {
                          backgroundColor: isAscActive
                            ? colors.accent
                            : colors.surface,
                          borderColor: isAscActive
                            ? colors.accent
                            : colors.border,
                          borderRadius: radii.sm,
                          paddingVertical: spacing.sm,
                          paddingHorizontal: spacing.md,
                          opacity: pressed ? 0.82 : 1,
                        },
                      ]}>
                      <AppText
                        variant="bodyStrong"
                        color={isAscActive ? 'onAccent' : 'textPrimary'}>
                        {group.ascLabel}
                      </AppText>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isDescActive }}
                      accessibilityLabel={`${group.title} ${group.descLabel}`}
                      onPress={() => handleSelectOption(group.field, 'desc')}
                      style={({ pressed }) => [
                        styles.directionPill,
                        {
                          backgroundColor: isDescActive
                            ? colors.accent
                            : colors.surface,
                          borderColor: isDescActive
                            ? colors.accent
                            : colors.border,
                          borderRadius: radii.sm,
                          paddingVertical: spacing.sm,
                          paddingHorizontal: spacing.md,
                          opacity: pressed ? 0.82 : 1,
                        },
                      ]}>
                      <AppText
                        variant="bodyStrong"
                        color={isDescActive ? 'onAccent' : 'textPrimary'}>
                        {group.descLabel}
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={[styles.footerRow, { gap: spacing.sm }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpiar ordenamiento y volver al orden por defecto"
              disabled={currentSort === null}
              onPress={handleClearSort}
              style={({ pressed }) => [
                styles.footerButton,
                {
                  backgroundColor:
                    currentSort !== null ? colors.background : TRANSPARENT_COLOR,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  paddingVertical: spacing.md,
                  opacity: currentSort === null ? 0.45 : pressed ? 0.82 : 1,
                },
              ]}>
              <AppText
                variant="bodyStrong"
                color={currentSort !== null ? 'negative' : 'textMuted'}>
                Limpiar ordenamiento
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar selector de ordenamiento"
              onPress={onClose}
              style={({ pressed }) => [
                styles.footerButton,
                {
                  backgroundColor: colors.accent,
                  borderColor: colors.accent,
                  borderRadius: radii.md,
                  paddingVertical: spacing.md,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}>
              <AppText variant="bodyStrong" color="onAccent">
                Listo
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  handleRow: {
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  criterionCard: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  directionRow: {
    flexDirection: 'row',
  },
  directionPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  footerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default MarketSortSheet;
