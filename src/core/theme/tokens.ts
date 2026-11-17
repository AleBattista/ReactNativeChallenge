/**
 * Tokens primitivos. NO se usan directo en componentes: los componentes
 * consumen colores SEMÁNTICOS del tema (themes.ts), así Dark/Light es un swap.
 */

export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F7F8FA',
  gray100: '#EEF0F4',
  gray200: '#DDE1E8',
  gray400: '#9AA3B2',
  gray500: '#6B7385',
  gray700: '#2A2F3A',
  gray800: '#1C2029',
  gray900: '#12151C',
  gray950: '#0A0C10',
  green400: '#2FD18A',
  green600: '#0F9D58',
  red400: '#FF6B6B',
  red600: '#D93025',
  blue400: '#5B9BFF',
  blue600: '#1A6BE0',
  amber500: '#F5A524',
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

/**
 * `fontVariant: ['tabular-nums']` en todo lo numérico: los dígitos tienen el
 * mismo ancho y los precios no "bailan" cuando cambian en vivo.
 */
export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  price: { fontSize: 16, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  priceLarge: { fontSize: 32, lineHeight: 38, fontWeight: '700', fontVariant: ['tabular-nums'] },
} as const;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radii;
export type TypographyVariant = keyof typeof typography;
