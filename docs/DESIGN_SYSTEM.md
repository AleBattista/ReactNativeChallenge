# Design System — Financial Market Mobile App

Este documento define los fundamentos visuales, tokens semánticos, escala tipográfica, sistema de espaciado y catálogo de componentes primitivos de la aplicación.

---

## 1. Introducción y Objetivo

El **Design System** tiene tres objetivos arquitectónicos principales:

1. **Consistencia Visual Fintech de Alta Gama:** Garantizar una jerarquía visual clara y legible ante flujos de datos bursátiles de alta densidad (2.100+ activos cotizando en tiempo real), evitando saltos ópticos mediante números tabulares (`tabular-nums`) y contrastes calibrados.
2. **Separación Estricta entre Presentación y Lógica de Negocio (Clean Architecture):** Los componentes del Design System son estrictamente **presentacionales puros (*dumb components*)**. No importan repositorios, no conocen casos de uso ni se acoplan a stores transaccionales; reciben únicamente `props` primitivas e inmutables y emiten eventos mediante callbacks.
3. **Soporte Nativo Dual (Dark / Light Mode):** Los componentes jamás referencian códigos hexadecimales crudos. Consumen exclusivamente **tokens semánticos** expuestos por `useTheme()` (`src/core/theme/ThemeProvider.tsx`), sincronizados con `ThemeStore` (persistido en `AsyncStorage`, con modo `dark` por defecto).

```text
src/core/theme/
├── colors.ts          # Paleta primitiva (palette) y mapeos semánticos lightColors / darkColors
├── tokens.ts          # Escalas de espaciado (spacing), radios (radii) y tipografía (typography)
├── themes.ts          # Contratos Theme / ColorScheme (lightTheme, darkTheme)
└── ThemeProvider.tsx  # Contexto reactivo conectado a ThemeStore (useTheme, useThemePreference)
```

---

## 2. Tokens de Color (Color Palette)

La arquitectura de color prohíbe el blanco puro (`#FFFFFF`) como fondo general en modo claro y el negro absoluto (`#000000`) en modo oscuro para reducir la fatiga visual y generar profundidad mediante capas (`background` $\rightarrow$ `surface` $\rightarrow$ `surfaceElevated`) delimitadas por bordes de `StyleSheet.hairlineWidth`.

### 2.1. Superficies, Fondos y Jerarquía de Texto

| Token Semántico | Modo Oscuro (`dark`) | Modo Claro (`light`) | Propósito Visual |
|---|---|---|---|
| `background` | `#0F172A` (*Space 950*) | `#F4F5F7` (*Pearl 100*) | Fondo base de pantallas y listas (`FlashList`). |
| `surface` | `#1A1D26` (*Carbon 900*) | `#FFFFFF` (*White*) | Superficie principal de tarjetas (`Card`), celdas y barras de navegación. |
| `surfaceElevated` | `#1E293B` (*Slate 800*) | `#F8F9FA` (*Pearl 50*) | Estado presionado de filas, modales flotantes y contenedores destacados. |
| `border` | `#2E3646` (*Slate 700*) | `#E2E8F0` (*Slate 200*) | Divisores de `hairlineWidth` y contornos sutiles de tarjetas e inputs. |
| `textPrimary` | `#F8FAFC` (*Pearl 50*) | `#0F172A` (*Space 950*) | Tickers, títulos principales y precios de cotización. |
| `textSecondary` | `#94A3B8` (*Slate 400*) | `#475569` (*Slate 600*) | Descripciones de activos, subtítulos y etiquetas de métricas. |
| `textMuted` | `#64748B` (*Slate 500*) | `#94A3B8` (*Slate 400*) | Placeholders, timestamps, iconos inactivos y ayudas contextuales. |

### 2.2. Acentos y Estados Financieros (Alzas, Bajas y Operatoria)

| Token Semántico | Modo Oscuro (`dark`) | Modo Claro (`light`) | Uso en Interfaz Financiera |
|---|---|---|---|
| `accent` | `#3B82F6` (*Blue 400*) | `#2563EB` (*Blue 600*) | Acciones primarias, barra decorativa de títulos, indicadores de foco y progreso. |
| `onAccent` | `#FFFFFF` (*White*) | `#FFFFFF` (*White*) | Texto e iconografía sobre botones primarios o de compra/venta. |
| `positive` | `#10B981` (*Emerald 400*) | `#059669` (*Emerald 600*) | Variación diaria positiva ($> 0\%$), punta compradora (*Bid*) y ganancias (P&L $> 0$). |
| `negative` | `#F43F5E` (*Rose 400*) | `#DC2626` (*Rose 600*) | Variación diaria negativa ($< 0\%$), punta vendedora (*Ask*), pérdidas y errores. |
| `neutral` | `#94A3B8` (*Slate 400*) | `#64748B` (*Slate 500*) | Variación neutra ($0,00\%$) o activos sin cambio respecto al precio de referencia. |
| `positiveSoft` | `rgba(16, 185, 129, 0.16)` | `rgba(5, 150, 105, 0.12)` | Fondo translúcido de `ChangeBadge` alcista y *flash* de suba en el UI Thread. |
| `negativeSoft` | `rgba(244, 63, 94, 0.16)` | `rgba(220, 38, 38, 0.12)` | Fondo translúcido de `ChangeBadge` bajista, alertas y *flash* de baja en el UI Thread. |
| `neutralSoft` | `#242B3A` (*Carbon 850*) | `#EEF2F6` (*Slate 100*) | Fondo de tags (`BCBA · ARS`), botones *Ghost*, *Segmented Control* y *Empty States*. |
| `buy` | `#10B981` (*Emerald 400*) | `#059669` (*Emerald 600*) | CTA transaccional de **Compra** en `AssetDetailScreen` y `OrderModalScreen`. |
| `sell` | `#F43F5E` (*Rose 400*) | `#DC2626` (*Rose 600*) | CTA transaccional de **Venta** en `AssetDetailScreen` y `OrderModalScreen`. |
| `warning` | `#F59E0B` (*Amber 400*) | `#D97706` (*Amber 600*) | Estados de advertencia o alertas no bloqueantes. |

---

## 3. Tipografía (Typography System)

Todo texto de la aplicación se renderiza exclusivamente a través del componente primitivo `<AppText />`. Las variantes numéricas y monetarias aplican obligatoriamente **`fontVariant: ['tabular-nums']`** (*Tabular Figures*), garantizando que todos los dígitos ocupen el mismo ancho horizontal y evitando el "baile" visual cuando las cotizaciones fluctúan en vivo.

| Variante (`TypographyVariant`) | `fontSize` | `lineHeight` | `fontWeight` | `fontVariant` | Aplicación Principal |
|---|---|---|---|---|---|
| `display` | `28 px` | `34 px` | `'700'` (Bold) | Estándar | Títulos heroicos e iconografía destacada en estados vacíos. |
| `title` | `20 px` | `26 px` | `'600'` (SemiBold) | Estándar | Encabezados de pantallas, títulos de tarjetas y modales. |
| `body` | `15 px` | `20 px` | `'400'` (Regular) | Estándar | Descripciones de activos, textos de ayuda y contenido general. |
| `bodyStrong` | `15 px` | `20 px` | `'600'` (SemiBold) | Estándar | Símbolos (*Tickers*), etiquetas de botones y valores destacados. |
| `caption` | `12 px` | `16 px` | `'400'` (Regular) | Estándar | Subtítulos de contexto, etiquetas de grillas (`Apertura`, `Volumen`) y badges. |
| `price` | `16 px` | `20 px` | `'600'` (SemiBold) | `['tabular-nums']` | Precios en celdas de listado (`MarketItemRow`, `FavoriteItemRow`) y `ChangeBadge`. |
| `priceLarge` | `32 px` | `38 px` | `'700'` (Bold) | `['tabular-nums']` | Precio principal en `AssetDetailScreen` y saldo disponible en `OrdersScreen`. |

---

## 4. Componentes Primitivos y Reutilizables (*Dumb Components*)

Los componentes compartidos residen en `src/presentation/shared/components/` (con componentes especializados de presentación en cada módulo). Todos están envueltos en `React.memo`, poseen exportación dual (`named` + `default`) y **carecen de estado de negocio global**:

| Componente | Ubicación | Props Principales | Responsabilidad Presentacional |
|---|---|---|---|
| **`AppText`** | `shared/components/AppText.tsx` | `variant?: TypographyVariant`, `color?: keyof ThemeColors` | Único punto de renderizado tipográfico. Resuelve tamaño, interlineado y color semántico desde `useTheme()`. |
| **`AppButton`** | `shared/components/AppButton.tsx` | `label: string`, `onPress: () => void`, `variant?: 'primary' \| 'secondary'` | Botón de acción estándar con borde `hairlineWidth`, radio `radii.md` y feedback táctil inmediato (`opacity: pressed ? 0.82 : 1`). |
| **`Card`** | `shared/components/Card.tsx` | `padding?: Spacing`, `radius?: Radius`, `elevated?: boolean` | Contenedor de superficie (`surface` o `surfaceElevated`) con radio `radii.lg` (`16 px`) por defecto y borde fino `colors.border`. |
| **`ChangeBadge`** | `shared/components/ChangeBadge.tsx` | `value: number \| null` | Píldora de variación porcentual diaria. Determina el tono (`positive`, `negative`, `neutral`) a partir de la función pura `getTrend(value)` y formatea con `formatPercent(value)` en `tabular-nums`. |
| **`ScreenHeaderTitle`** | `shared/components/ScreenHeaderTitle.tsx` | `title: string`, `subtitle?: string` | Encabezado corporativo con barra vertical decorativa (`4 × 22 px` en `colors.accent`), título principal y subtítulo de contexto estilizado. |
| **`TabIcon`** | `navigation/TabIcon.tsx` | `variant: 'market' \| 'favorites' \| 'orders'`, `color`, `focused` | Iconografía vectorial construida con primitivas nativas (`View` de 3 velas financieras ascendentes con mechas para Mercado). |
| **`MarketSearchBar`** | `market/components/MarketSearchBar.tsx` | `value`, `onChangeText`, `onClear`, `resultCount`, `totalCount`, `sortConfig`, `onPressSort` | Barra de filtrado instantáneo con botón de limpieza (`✕`), contador tabular de resultados y disparador del `MarketSortSheet`. |

### Reglas de Interacción y Feedback Táctil
- **Respuesta al toque (`Pressed State`):** Todo componente interactivo (`AppButton`, celdas expandibles, píldoras de ordenamiento y CTAs de compra/venta) aplica una reducción uniforme de opacidad `opacity: pressed ? 0.82 : 1` (y/o transición de fondo a `colors.surfaceElevated`).
- **Botones Secundarios / *Ghost*:** Acciones contextuales dentro de celdas repetitivas (como `"Ver detalle →"` en `MarketItemRow`) utilizan fondo `colors.neutralSoft`, borde `StyleSheet.hairlineWidth` (`colors.border`) y texto `colors.accent` para no saturar visualmente el listado.
- **Controles Segmentados (*Pill Segmented Control*):** Las pestañas internas (ej. `Tenencias` vs. `Historial` en `OrdersScreen`) usan un contenedor `colors.neutralSoft` con `radii.pill`, resaltando la opción activa mediante elevación sutil en `colors.surface` y badge circular de conteo.

---

## 5. Espaciado y Layout (Spacings & Radii)

El sistema de layout se basa en una grilla modular de **4 puntos** definida en `src/core/theme/tokens.ts`. Ningún componente utiliza márgenes o paddings arbitrarios fuera de esta escala.

### 5.1. Escala de Espaciado (`spacing`)

| Token (`Spacing`) | Valor (`dp / px`) | Uso Estándar en Layout |
|---|---|---|
| `none` | `0` | Reseteo de márgenes o paddings. |
| `xxs` | `2` | Separación mínima entre etiqueta y valor numérico dentro de una misma celda. |
| `xs` | `4` | Padding interno de píldoras, tags de mercado (`BCBA · ARS`) y brechas compactas. |
| `sm` | `8` | Separación entre badges, padding vertical de inputs y barras secundarias. |
| `md` | `12` | Padding interno de tarjetas compactas, grillas de métricas y botones medianos. |
| `lg` | `16` | Margen horizontal estándar de pantalla (`paddingHorizontal`) y padding por defecto de `Card`. |
| `xl` | `24` | Contenedores de estados vacíos (*Empty States*) y separación entre bloques mayores. |
| `xxl` | `32` | Márgenes de respiración superior/inferior en vistas modales o pantallas de estado. |

### 5.2. Escala de Radios de Borde (`radii`) y Divisores

| Token (`Radius`) | Valor (`dp / px`) | Aplicación en Componentes |
|---|---|---|
| `sm` | `6` | Badges de variación (`ChangeBadge`), tags de mercado/moneda y botones compactos. |
| `md` | `10` | Botones de acción (`AppButton`), inputs de búsqueda/cantidad y cajas de desglose. |
| `lg` | `16` | Tarjetas principales (`Card`), modal flotante (`OrderModalScreen`) y bordes superiores de `MarketSortSheet`. |
| `pill` | `999` | Controles segmentados tipo píldora, barra de progreso de rango intradía y contenedores circulares de iconos (`64 × 64 px`). |

- **Divisores y Bordes (`StyleSheet.hairlineWidth`):** Todas las separaciones entre filas de `FlashList` y contornos de `Card` utilizan `StyleSheet.hairlineWidth` (1 píxel físico real según la densidad de pantalla del dispositivo) combinado con `colors.border`, logrando definición quirúrgica tanto en pantallas OLED oscuras como en modo claro.
