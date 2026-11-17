import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import type { Theme } from '../../core/theme/themes';

/**
 * Adapta nuestros tokens semánticos al tema de React Navigation, así headers,
 * tab bar y fondos de transición respetan Dark/Light sin estilos duplicados.
 */
export function toNavigationTheme(theme: Theme): NavigationTheme {
  const isDark = theme?.scheme === 'dark';
  const base = isDark ? NavigationDarkTheme : NavigationLightTheme;
  return {
    ...base,
    dark: isDark,
    colors: {
      ...base.colors,
      primary: theme.colors.accent,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      notification: theme.colors.negative,
    },
  };
}

export default toNavigationTheme;
