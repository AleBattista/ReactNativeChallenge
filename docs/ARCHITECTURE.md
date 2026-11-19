# Arquitectura de Ingeniería — Financial Market Mobile App

Este documento describe las decisiones de arquitectura, rendimiento y flujo de datos de la aplicación mobile de mercado financiero construida en **React Native + TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`)**.

---

## 1. Problema de Rendimiento y Tesis Arquitectónica

En una terminal bursátil mobile con **2.100+ instrumentos** que reciben actualizaciones de precios en tiempo real (streaming de *ticks* cada $2.0\text{–}3.0\text{ s}$ sobre lotes de activos), un enfoque tradicional de React basado en `useState`, `Context` o un store global único con persistencia en disco presenta tres cuellos de botella críticos:

1. **Re-renderizado masivo del árbol (Render Storm):** Guardar un arreglo `Asset[]` en estado de React o Context provoca que cada lote de *ticks* invalide la referencia de la lista completa y fuerce la reconciliación de miles de nodos en el hilo de JavaScript.
2. **Saturación de I/O por persistencia indiscriminada:** Persistir precios de alta frecuencia en `AsyncStorage` serializa megabytes de JSON en cada *tick*, bloqueando el puente nativo y degradando los FPS durante el scroll.
3. **Consumo de recursos en segundo plano y latencia al reanudar:** Mantener timers o sockets procesando actualizaciones mientras la app está minimizada drena batería; retomarla sin sincronizar el *viewport* deja precios obsoletos en pantalla.

### Solución: Arquitectura Híbrida de Dos Velocidades
Separamos estrictamente el estado de la aplicación según su **frecuencia de mutación** y su **naturaleza de negocio**:
- **Carril de Alta Frecuencia (Efímero, en memoria JS fuera de React):** `MarketMemoryStore` (`Map` / `Set`) + suscripciones granulares por celda mediante `useSyncExternalStore` + virtualización con `@shopify/flash-list` + animaciones en el UI Thread con `react-native-reanimated`.
- **Carril Transaccional y de Preferencias (Persistido):** 4 stores independientes en **Zustand + `AsyncStorage`** (`PortfolioStore`, `OrderStore`, `FavoritesStore`, `ThemeStore`) exclusivamente para datos del usuario que requieren durabilidad entre sesiones.

---

## 2. Clean Architecture y Regla de Dependencias

La aplicación se divide en tres capas concéntricas (`domain`, `data`, `presentation`), más dos módulos transversales (`core` y `app`):

- **Cumplimiento estático mediante ESLint (`.eslintrc.js`):** La regla `no-restricted-imports` bloquea en tiempo de compilación/linteo cualquier intento de:
  - Importar `react`, `react-native`, `data`, `presentation`, `app` o `core` dentro de `src/domain/**`.
  - Importar `react`, `react-native` o `presentation` dentro de `src/data/**`.
  - Importar implementaciones concretas de `src/data/**` directamente desde `src/presentation/**` (la UI consume únicamente interfaces del dominio inyectadas por `DependenciesProvider`).

### Estructura de Directorios (`src/`)

```text
src/
├── app/                                 # Composition Root y Estado Global Persistido
│   ├── di/
│   │   ├── container.ts                 # Ensamblado de MarketRepositoryImpl, MockMarketDataSource y MockLiveQuoteSource
│   │   └── DependenciesProvider.tsx     # Inyección por Context estable + listener de ciclo de vida (AppState)
│   └── store/                           # Persistencia Selectiva (Zustand + AsyncStorage)
│       ├── PortfolioStore.ts            # Saldo inicial ($1.000.000 ARS), tenencias y transacciones atómicas
│       ├── OrderStore.ts                # Historial cronológico y motor de ejecución asíncrona en background
│       ├── FavoritesStore.ts            # Lista reactiva de tickers favoritos
│       ├── ThemeStore.ts                # Modo visual ('dark' | 'light') con default 'dark'
│       ├── SettingsStore.ts             # Preferencias generales de usuario
│       └── storage.ts                   # Adaptador createJSONStorage sobre AsyncStorage con fallback en memoria
├── core/
│   ├── theme/                           # Sistema de diseño Dark / Light
│   │   ├── colors.ts                    # Paleta fintech (gris perla #F4F5F7 en light, carbón #0F172A en dark)
│   │   ├── tokens.ts                    # Spacing, radii y tipografía con tabular-nums
│   │   ├── themes.ts                    # Mapeo semántico lightTheme / darkTheme
│   │   └── ThemeProvider.tsx            # Sincronización reactiva entre ThemeStore y toda la UI
│   └── utils/
│       ├── numbers.ts                   # Saneo numérico (positiveOrNull, nonNegativeOrZero)
│       └── formatters.ts                # Formatters es-AR cacheados (Intl.NumberFormat)
├── domain/                              # TypeScript 100% puro (0 imports de React)
│   ├── shared/                          # Result<T, E>, DomainError, Ticker, Currency, Timestamp, Unsubscribe
│   ├── market/
│   │   ├── entities/                    # AssetInfo (estático), Quote (dinámico), Asset, getTrend, getSpread
│   │   └── repositories/                # Puertos: MarketRepository y QuoteFeed (con pause/resume/getActiveSymbols)
│   ├── orders/
│   │   ├── entities/                    # Order (MarketOrder | LimitOrder), OrderRequest
│   │   └── repositories/                # OrderRepository
│   └── portfolio/
│       ├── entities/                    # Portfolio, Position, CashBalance, PositionValuation
│       └── repositories/                # PortfolioRepository
├── data/                                # Infraestructura de Mercado (sin React)
│   └── market/
│       ├── dto/                         # AssetPriceDto y type guards en el borde
│       ├── mappers/                     # assetMapper.ts (normalización de 0 y nulls)
│       ├── datasources/
│       │   ├── fixtures/assetPrices.json
│       │   ├── syntheticDataset.ts      # Generador determinístico de 2.100+ activos con coherencia financiera
│       │   ├── MarketRemoteDataSource.ts# HttpMarketDataSource y MockMarketDataSource (latencia 300-1500ms, 8% fallo)
│       │   └── LiveQuoteSource.ts       # MockLiveQuoteSource (PrecioReferencia fijo, spread constante, Sync-on-Resume)
│       ├── store/
│       │   └── MarketMemoryStore.ts     # Buffer en memoria (Map/Set) fuera de React con batching por microtask
│       └── repositories/
│           └── MarketRepositoryImpl.ts  # Implementación de MarketRepository + puente de ciclo de vida
└── presentation/
    ├── navigation/
    │   ├── types.ts                     # Tipado estricto: RootStackParamList y BottomTabParamList
    │   ├── AppNavigator.tsx             # Native Stack raíz (MainTabs, AssetDetail, OrderModal transparentModal)
    │   ├── MainTabNavigator.tsx         # Bottom Tabs (Mercado, Favoritos, Órdenes)
    │   ├── TabIcon.tsx                  # Iconografía vectorial nativa (velas financieras para Mercado)
    │   └── navigationTheme.ts           # Adaptador de Theme a React Navigation
    ├── shared/components/               # AppText, AppButton, Card, ChangeBadge, ScreenHeaderTitle
    ├── market/
    │   ├── hooks/                       # useLiveQuote (useSyncExternalStore) y useMarketCatalog
    │   ├── components/                  # MarketItemRow, MarketSearchBar, MarketSortSheet, ThemeToggleSwitch
    │   └── screens/                     # MarketScreen y AssetDetailScreen
    ├── favorites/
    │   ├── components/                  # FavoriteItemRow
    │   └── screens/                     # FavoritesScreen
    └── orders/
        ├── components/                  # HoldingItemRow y OrderHistoryItemRow
        └── screens/                     # OrdersScreen y OrderModalScreen
```

---

## 3. Buffer de Memoria en JavaScript (`MarketMemoryStore`) y Sincronización Atómica (`useSyncExternalStore`)

### Por qué los precios viven fuera del árbol de React
Con 2.100+ activos generados por `syntheticDataset.ts` y lotes de 120 *ticks* cada $2.5\text{ s}$ desde `MockLiveQuoteSource`, almacenar las cotizaciones en React implicaría recrear estructuras de lista en cada emisión. En su lugar, `MarketMemoryStore` opera en JavaScript puro:

1. **Separación entre metadatos estáticos (`AssetInfo`) y cotización caliente (`Quote`):**
   - `assetInfoBySymbol: Map<Ticker, AssetInfo>` almacena descripción, mercado y moneda (inmutables durante la sesión).
   - `quotes: Map<Ticker, Quote>` almacena únicamente los valores dinámicos (`lastPrice`, `changePercent`, `bid`, `ask`, `dayLow`, `dayHigh`, `volume`, `tradedAmount`).
2. **Grafo de suscripción $O(1)$ por símbolo (`Map<Ticker, Set<Listener>>`):**
   - Cada celda montada en el *viewport* se suscribe exclusivamente a su `ticker` mediante `quoteFeed.subscribe(symbol, listener)`.
   - Cuando `applyPatches(patches)` procesa un lote de actualizaciones, reemplaza **únicamente** las instancias `Quote` que sufrieron un cambio real de valor (`!isSameQuote(prev, next)`), conservando intacta la identidad referencial de los otros ~1.980 activos.
3. **Deduplicación y Batching por Microtask:**
   - Los *ticks* acumulados en un mismo turno del *event loop* se agrupan en `pending: Set<Ticker>` y se despachan en un único `flush` asíncrono, despertando únicamente a los *listeners* de los símbolos modificados.

### Conexión Celda por Celda con `useSyncExternalStore`

En lugar de que toda la pantalla o toda la lista escuche los cambios de precios, cada fila (`MarketItemRow`) se suscribe **solo a su propio ticker** (por ejemplo, `ALUA` o `AGRO`) usando `useSyncExternalStore`:

- Cuando llega un nuevo precio para `ALUA`, el store en memoria (`Map` + `Set` de *listeners*) avisa **únicamente a la celda de `ALUA`**.
- `FlashList` mantiene su arreglo de símbolos (`readonly Ticker[]`) sin cambios de referencia y las demás filas (como `AGRO`) no se re-renderizan.
- Así evitamos re-renders en cascada y mantenemos la lista fluida incluso con más de 2.100 activos actualizándose en vivo.

---

## 4. Virtualización (`@shopify/flash-list`) y Animaciones en el UI Thread (`react-native-reanimated`)

1. **Colección de primitivas en `FlashList`:**
   - `MarketScreen` y `FavoritesScreen` pasan a `FlashList` un arreglo `readonly Ticker[]` (`string[]`) en lugar de objetos `Quote[]`. Como los *ticks* de precios no alteran la lista de símbolos, `FlashList` no re-ejecuta el layout de la lista ante cambios de precio.
2. **Reciclaje sin saltos de scroll (*Scroll Jump Mitigation*):**
   - `MarketScreen` mantiene el estado de filas expandidas en un `Set<Ticker>` local (`expandedTickers`), fuera de Zustand.
   - `FlashList` recibe `estimatedItemSize={76}`, `getItemType={item => expandedTickers.has(item) ? 'expanded' : 'collapsed'}` (separando los pools de reciclaje por altura) y `maintainVisibleContentPosition={{ disabled: false }}`.
   - El contenedor raíz de `MarketItemRow` omite deliberadamente animaciones de layout (`LinearTransition`) en el wrapper externo para evitar colisiones con el posicionamiento absoluto del reciclador de `FlashList`.
3. **Flash de precio en el UI Thread y protección contra el *Flash-flash bug*:**
   - El parpadeo verde/rojo ante subas o bajas se ejecuta a 60 FPS en el hilo nativo de UI mediante worklets de `react-native-reanimated` (`useSharedValue`, `withSequence`, `interpolateColor`, `useAnimatedStyle`).
   - Cuando `FlashList` recicla una celda para otro `ticker`, un `useEffect` sobre `[ticker]` ejecuta `cancelAnimation(flashProgress)`, resetea `flashProgress.value = 0` y sincroniza `prevTickerRef` / `prevPriceRef` para impedir que una celda reciclada herede el destello de otro activo.
4. **Ordenamiento Imperativo sobre Resultados Filtrados (`MarketSortSheet`):**
   - El ordenamiento por `symbol`, `changePercent` o `tradedAmount` (`asc` / `desc`) se ejecuta de forma imperativa sobre el subconjunto ya filtrado por la búsqueda (`matchedSymbols`), tomando una instantánea de `quoteFeed.getQuote`. Esto evita que la lista se reordene sola cada $2.5\text{ s}$ mientras el usuario interactúa con la pantalla.

---

## 5. Gestión del Ciclo de Vida (`AppState`) y Estrategia *Sync-on-Resume*

Para optimizar batería, CPU y frescura de datos, `DependenciesProvider` escucha las transiciones de `AppState` (`active` vs. `background` / `inactive`) y gobierna el puerto `QuoteFeed` sin acoplar ninguna pantalla:

- **Por qué `getActiveSymbols()` es exacto:** Como `useSyncExternalStore` suscribe cada celda al montarse en el *viewport* de `FlashList` y la desuscribe al salir, `[...this.listenersBySymbol.keys()]` en `MarketMemoryStore` refleja en todo momento el conjunto exacto de activos visibles por el usuario.

---

## 6. Persistencia Selectiva con Zustand + `AsyncStorage`

A diferencia del streaming de mercado (que es efímero y vive en `MarketMemoryStore`), el estado transaccional y de configuración del usuario se divide en **4 stores independientes de Zustand** bajo `src/app/store/`, persistidos en `AsyncStorage` mediante `persist` y `createJSONStorage`:

| Store | Clave en `AsyncStorage` | Responsabilidad y Reglas de Negocio |
|---|---|---|
| **`PortfolioStore`** | `challenge:portfolio-store` | Inicializa `cashBalance` estrictamente en **`$1.000.000 ARS`**. Ejecuta compras (`executeBuy`) y ventas (`executeSell`) con validación atómica (`cashBalance >= totalFinal` con comisión $0.5\%$ + IVA $21\%$, y `ownedQuantity >= quantity`), recalculando el precio promedio ponderado (`averagePrice`). |
| **`OrderStore`** | `challenge:order-store` | Persiste el historial de órdenes de más nueva a más vieja (`PENDING` $\rightarrow$ `EXECUTED` \| `REJECTED`). Ejecuta temporizadores a nivel módulo (fuera de React) para resolver órdenes pendientes en segundo plano aunque el usuario cambie de pestaña, y reanuda órdenes pendientes en `onRehydrateStorage`. |
| **`FavoritesStore`** | `challenge:favorites-store` | Persiste la lista de `Ticker[]` favoritos con acción `toggleFavorite(ticker)` sincronizada reactivamente entre `MarketItemRow`, `AssetDetailScreen` y `FavoritesScreen`. |
| **`ThemeStore`** | `challenge:theme-store` | Persiste el modo visual (`'dark' \| 'light'`, por defecto `'dark'`) consumido por `ThemeProvider` y controlado desde `ThemeToggleSwitch` en el header de `MarketScreen`. |

---

## 7. Reglas Financieras y Normalización de Datos Crudos

### Normalización en el Borde (`assetMapper.ts`)
| Campo en JSON Crudo (`AssetPriceDto`) | Problemática del Feed | Normalización al Dominio (`Asset` / `Quote`) |
|---|---|---|
| `ultimoCierre: 0` (ej. ALUA) | El backend envía `0` cuando no hay dato de cierre previo | `previousClose: null` (`positiveOrNull`) |
| Precios `<= 0` o `null` | Valores no operativos | `null` (los formatters muestran `—` sin condicionales en la UI) |
| `tasaCompra: 0`, `tasaVenta: 0`, `tir: null` | Sin sentido financiero en acciones (`EQUITY`) | `quote.yield: null` |
| `maturityDate` o `tir` presentes | Identifica bonos / renta fija | `instrumentType: 'FIXED_INCOME'` |

### Reglas del Motor en Vivo (`MockLiveQuoteSource`) y Derivados en UI

1. **Precio de Referencia Fijo Inicial:** Como `ultimoCierre` viene en `0` en gran parte del catálogo, al inicializar cada activo se calcula un precio de referencia base a partir del precio inicial y su variación inicial (`precioReferencia = ultimoPrecioInicial / (1 + variacionDiariaInicial / 100)`). En cada *tick* posterior (movimientos de hasta `±0.5%`), la variación diaria se recalcula en tiempo real tomando como base ese valor inicial fijo.
2. **Spread Constante y Rango Intradía:** Las puntas de compra (`bid`) y venta (`ask`) se ajustan en la misma proporción que el último precio, y los mínimos y máximos del día (`dayLow` / `dayHigh`) se actualizan automáticamente si el nuevo precio los supera.
3. **Barra de Rango con Clamping (`AssetDetailScreen`):** La posición del precio actual entre el mínimo y el máximo del día se mantiene acotada entre `0` y `1` (`computeClampedDayRangeProgress`), evitando desbordes visuales si un precio cotiza fuera de rango o si el mínimo y el máximo coinciden.
