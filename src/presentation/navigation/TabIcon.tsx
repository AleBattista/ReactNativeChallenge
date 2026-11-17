import React, { memo } from 'react';
import { StyleSheet, Text } from 'react-native';

interface TabIconProps {
  readonly glyph: string;
  readonly color: string;
  readonly size: number;
  readonly focused: boolean;
}

/**
 * Ícono mínimo basado en glifos Unicode (sin librería de íconos todavía).
 * Se reemplaza por react-native-svg / vector-icons sin tocar el navigator.
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
