import React, { memo, useCallback } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useThemeStore } from '../../../app/store/ThemeStore';
import { useTheme } from '../../../core/theme/ThemeProvider';
import { AppText } from '../../shared/components/AppText';

/**
 * Interruptor táctil de tema (Dark / Light Mode) para el encabezado de `MarketScreen`.
 *  - Suscrito reactivamente a `useThemeStore`.
 *  - Combina un indicador visual sutil (🌙 / ☀️) con el componente nativo `<Switch />`.
 */
export const ThemeToggleSwitch = memo(function ThemeToggleSwitchBase() {
  const { colors, spacing } = useTheme();
  const mode = useThemeStore(state => state.mode);
  const toggleTheme = useThemeStore(state => state.toggleTheme);

  const isDark = mode === 'dark';

  const handleValueChange = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingRight: spacing.md,
          gap: spacing.xs,
        },
      ]}>
      <AppText
        variant="body"
        accessibilityElementsHidden
        importantForAccessibility="no">
        {isDark ? '🌙' : '☀️'}
      </AppText>
      <Switch
        value={isDark}
        onValueChange={handleValueChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.border}
        accessibilityRole="switch"
        accessibilityLabel={
          isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
        }
        accessibilityState={{ checked: isDark }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ThemeToggleSwitch;
