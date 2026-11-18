import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type TabIconVariant = 'market' | 'favorites' | 'orders';

export interface TabIconProps {
  readonly variant?: TabIconVariant;
  readonly glyph?: string;
  readonly color: string;
  readonly size: number;
  readonly focused: boolean;
}

/**
 * Iconografía vectorial ligera para la barra de navegación inferior:
 *  - `market`: barras/velas financieras ascendentes representativas del mercado bursátil.
 *  - `favorites`: estrella de seguimiento.
 *  - `orders`: barras horizontales de cartera y libro de órdenes.
 */
export const TabIcon = memo(function TabIconBase({
  variant = 'market',
  glyph,
  color,
  size,
  focused,
}: TabIconProps) {
  if (variant === 'market' && !glyph) {
    return (
      <View
        accessible={false}
        style={[
          styles.chartContainer,
          focused ? styles.focused : styles.unfocused,
          { width: size, height: size - 2 },
        ]}>
        {/* Vela / barra 1 (corta) */}
        <View style={styles.candleColumn}>
          <View style={[styles.wickTop, { backgroundColor: color }]} />
          <View
            style={[
              styles.candleBody,
              styles.bodyShort,
              { backgroundColor: color },
            ]}
          />
          <View style={[styles.wickBottom, { backgroundColor: color }]} />
        </View>

        {/* Vela / barra 2 (media) */}
        <View style={styles.candleColumn}>
          <View style={[styles.wickTop, { backgroundColor: color }]} />
          <View
            style={[
              styles.candleBody,
              styles.bodyMedium,
              { backgroundColor: color },
            ]}
          />
          <View style={[styles.wickBottom, { backgroundColor: color }]} />
        </View>

        {/* Vela / barra 3 (alta - tendencia alcista) */}
        <View style={styles.candleColumn}>
          <View style={[styles.wickTop, { backgroundColor: color }]} />
          <View
            style={[
              styles.candleBody,
              styles.bodyTall,
              { backgroundColor: color },
            ]}
          />
          <View style={[styles.wickBottom, { backgroundColor: color }]} />
        </View>
      </View>
    );
  }

  const resolvedGlyph =
    glyph ?? (variant === 'favorites' ? (focused ? '★' : '☆') : '≡');

  return (
    <Text
      accessible={false}
      style={[
        focused ? styles.focused : styles.unfocused,
        { color, fontSize: size - 2 },
      ]}>
      {resolvedGlyph}
    </Text>
  );
});

const styles = StyleSheet.create({
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
    paddingBottom: 1,
  },
  candleColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  wickTop: {
    width: 1.5,
    height: 3,
    borderRadius: 1,
  },
  wickBottom: {
    width: 1.5,
    height: 2,
    borderRadius: 1,
  },
  candleBody: {
    width: 4.5,
    borderRadius: 1.5,
  },
  bodyShort: {
    height: 7,
  },
  bodyMedium: {
    height: 11,
  },
  bodyTall: {
    height: 15,
  },
  focused: { opacity: 1 },
  unfocused: { opacity: 0.78 },
});

export default TabIcon;
