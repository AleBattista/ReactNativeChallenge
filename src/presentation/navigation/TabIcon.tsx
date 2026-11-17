import React, { memo } from 'react';
import { StyleSheet, Text } from 'react-native';

export interface TabIconProps {
  readonly glyph: string;
  readonly color: string;
  readonly size: number;
  readonly focused: boolean;
}

/**
 * Ícono mínimo basado en glifos Unicode (sin librería de íconos externa).
 * Exportación dual (named + default) para evitar fallos de resolución en Metro.
 */
export const TabIcon = memo(function TabIconBase({
  glyph,
  color,
  size,
  focused,
}: TabIconProps) {
  return (
    <Text
      accessible={false}
      style={[
        focused ? styles.focused : styles.unfocused,
        { color, fontSize: size - 2 },
      ]}>
      {glyph}
    </Text>
  );
});

const styles = StyleSheet.create({
  focused: { opacity: 1 },
  unfocused: { opacity: 0.8 },
});

export default TabIcon;
