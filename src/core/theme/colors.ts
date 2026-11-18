/**
 * Paleta y tokens semánticos de color para estética Fintech Premium.
 *
 * Reglas de diseño:
 *  - Modo Claro (`lightColors`): fondo general gris perla suave (`#F4F5F7`),
 *    evitando el blanco puro en el fondo principal; superficies limpias
 *    (`#FFFFFF`) y bordes sutiles definidos (`#E2E8F0`).
 *  - Modo Oscuro (`darkColors`): fondo general gris espacial profundo
 *    (`#0F172A`), evitando el negro absoluto (`#000000`); superficies
 *    (`#1A1D26` / `#1E293B`) y bordes de contraste sutil (`#2E3646`).
 */

export interface ThemeColors {
  readonly background: string;
  readonly surface: string;
  readonly surfaceElevated: string;
  readonly border: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly accent: string;
  readonly onAccent: string;
  /** Movimientos de mercado. */
  readonly positive: string;
  readonly negative: string;
  readonly neutral: string;
  readonly positiveSoft: string;
  readonly negativeSoft: string;
  readonly neutralSoft: string;
  /** Lados de una orden. */
  readonly buy: string;
  readonly sell: string;
  readonly warning: string;
}

export const palette = {
  white: '#FFFFFF',
  pearl50: '#F8F9FA',
  pearl100: '#F4F5F7',
  slate100: '#EEF2F6',
  slate200: '#E2E8F0',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#2E3646',
  slate800: '#1E293B',
  carbon850: '#242B3A',
  carbon900: '#1A1D26',
  space950: '#0F172A',
  emerald400: '#10B981',
  emerald600: '#059669',
  rose400: '#F43F5E',
  rose600: '#DC2626',
  blue400: '#6439ff',
  blue600: '#6439ff',
  amber400: '#F59E0B',
  amber600: '#D97706',
} as const;

export const lightColors: ThemeColors = {
  background: palette.pearl100, // #F4F5F7 (gris perla suave, sin blanco puro de fondo)
  surface: palette.white, // #FFFFFF
  surfaceElevated: palette.pearl50, // #F8F9FA
  border: palette.slate200, // #E2E8F0
  textPrimary: palette.space950, // #0F172A
  textSecondary: palette.slate600, // #475569
  textMuted: palette.slate400, // #94A3B8
  accent: palette.blue600, // #6439ff
  onAccent: palette.white, // #FFFFFF
  positive: palette.emerald600, // #059669
  negative: palette.rose600, // #DC2626
  neutral: palette.slate500, // #64748B
  positiveSoft: 'rgba(5, 150, 105, 0.12)',
  negativeSoft: 'rgba(220, 38, 38, 0.12)',
  neutralSoft: palette.slate100, // #EEF2F6
  buy: palette.emerald600,
  sell: palette.rose600,
  warning: palette.amber600,
};

export const darkColors: ThemeColors = {
  background: palette.space950, // #0F172A (gris espacial profundo, sin negro puro)
  surface: palette.carbon900, // #1A1D26
  surfaceElevated: palette.slate800, // #1E293B
  border: palette.slate700, // #2E3646
  textPrimary: palette.pearl50, // #F8FAFC
  textSecondary: palette.slate400, // #94A3B8
  textMuted: palette.slate500, // #64748B
  accent: palette.blue400, // #3B82F6
  onAccent: palette.white, // #FFFFFF
  positive: palette.emerald400, // #10B981
  negative: palette.rose400, // #F43F5E
  neutral: palette.slate400, // #94A3B8
  positiveSoft: 'rgba(16, 185, 129, 0.16)',
  negativeSoft: 'rgba(244, 63, 94, 0.16)',
  neutralSoft: palette.carbon850, // #242B3A
  buy: palette.emerald400,
  sell: palette.rose400,
  warning: palette.amber400,
};

export default {
  palette,
  lightColors,
  darkColors,
};
