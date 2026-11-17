import {
  INITIAL_CASH_BALANCE,
  useFavoritesStore,
  useOrderStore,
  usePortfolioStore,
  useSettingsStore,
} from '../index';

describe('Zustand Persisted Stores (src/app/store)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useOrderStore.getState().clearOrders();
    usePortfolioStore.getState().resetPortfolio();
    useFavoritesStore.getState().clearFavorites();
    useSettingsStore.getState().resetSettings();
  });

  afterEach(() => {
    useOrderStore.getState().clearOrders();
    jest.useRealTimers();
  });

  describe('PortfolioStore', () => {
    it('inicia estrictamente con $1,000,000 ARS y sin tenencias', () => {
      const state = usePortfolioStore.getState();
      expect(state.cashBalance).toBe(1_000_000);
      expect(state.cashBalance).toBe(INITIAL_CASH_BALANCE);
      expect(state.holdings).toEqual([]);
    });

    it('valida atómicamente cashBalance >= montoTotal al comprar y calcula precio promedio ponderado', () => {
      const store = usePortfolioStore.getState();

      // Compra 1: 100 ALUA a $1.000 = $100.000
      const res1 = store.executeBuy('ALUA', 100, 1000);
      expect(res1.ok).toBe(true);
      expect(usePortfolioStore.getState().cashBalance).toBe(900_000);
      expect(usePortfolioStore.getState().getHolding('ALUA')).toEqual({
        ticker: 'ALUA',
        quantity: 100,
        averagePrice: 1000,
      });

      // Compra 2: 100 ALUA a $1.200 = $120.000 -> promedio = $1.100, cantidad = 200
      const res2 = usePortfolioStore.getState().executeBuy('ALUA', 100, 1200);
      expect(res2.ok).toBe(true);
      expect(usePortfolioStore.getState().cashBalance).toBe(780_000);
      expect(usePortfolioStore.getState().getHolding('ALUA')).toEqual({
        ticker: 'ALUA',
        quantity: 200,
        averagePrice: 1100,
      });

      // Intento de compra que supera el saldo disponible ($780.000)
      const failedBuy = usePortfolioStore
        .getState()
        .executeBuy('GGAL', 1000, 1000);
      expect(failedBuy.ok).toBe(false);
      if (!failedBuy.ok) {
        expect(failedBuy.code).toBe('INSUFFICIENT_FUNDS');
      }
      // El saldo permanece intacto
      expect(usePortfolioStore.getState().cashBalance).toBe(780_000);
    });

    it('acredita efectivo al vender y valida tenencia suficiente', () => {
      usePortfolioStore.getState().executeBuy('AGRO', 50, 40); // -$2.000 -> $998.000

      // Venta parcial de 20 nominales a $50 = +$1.000 -> $999.000
      const sellPartial = usePortfolioStore.getState().executeSell('AGRO', 20, 50);
      expect(sellPartial.ok).toBe(true);
      expect(usePortfolioStore.getState().cashBalance).toBe(999_000);
      expect(usePortfolioStore.getState().getHolding('AGRO')).toEqual({
        ticker: 'AGRO',
        quantity: 30,
        averagePrice: 40,
      });

      // Intento de vender más nominales de los que se poseen
      const sellTooMuch = usePortfolioStore.getState().executeSell('AGRO', 31, 50);
      expect(sellTooMuch.ok).toBe(false);
      if (!sellTooMuch.ok) {
        expect(sellTooMuch.code).toBe('INSUFFICIENT_POSITION');
      }

      // Venta total de los 30 restantes -> se remueve la posición
      const sellAll = usePortfolioStore.getState().executeSell('AGRO', 30, 50);
      expect(sellAll.ok).toBe(true);
      expect(usePortfolioStore.getState().getHolding('AGRO')).toBeUndefined();
      expect(usePortfolioStore.getState().cashBalance).toBe(1_000_500);
    });
  });

  describe('OrderStore (historial y motor de simulación en segundo plano)', () => {
    it('ordena de más nueva a más vieja y resuelve en segundo plano a EXECUTED o REJECTED', () => {
      const first = useOrderStore.getState().placeOrder({
        ticker: 'ALUA',
        type: 'BUY',
        quantity: 10,
        price: 1000,
        simulationDelayMs: 2500,
      });
      const second = useOrderStore.getState().placeOrder({
        ticker: 'GGAL',
        type: 'BUY',
        quantity: 2000,
        price: 1000, // $2.000.000 > $1.000.000 -> debe rechazarse al ejecutarse
        simulationDelayMs: 3000,
      });

      // Ordenadas de más nueva (second) a más vieja (first), ambas en PENDING
      const initialOrders = useOrderStore.getState().orders;
      expect(initialOrders.map(o => o.id)).toEqual([second.id, first.id]);
      expect(initialOrders[0]?.status).toBe('PENDING');
      expect(initialOrders[1]?.status).toBe('PENDING');

      // Avanzamos el reloj 2.500 ms -> se resuelve `first` a EXECUTED y debita $10.000
      jest.advanceTimersByTime(2500);
      const afterFirst = useOrderStore.getState().orders;
      expect(afterFirst.find(o => o.id === first.id)?.status).toBe('EXECUTED');
      expect(usePortfolioStore.getState().cashBalance).toBe(990_000);

      // Avanzamos otros 500 ms (total 3.000 ms) -> se resuelve `second` a REJECTED por falta de fondos
      jest.advanceTimersByTime(500);
      const afterSecond = useOrderStore.getState().orders;
      const rejectedOrder = afterSecond.find(o => o.id === second.id);
      expect(rejectedOrder?.status).toBe('REJECTED');
      expect(rejectedOrder?.rejectionReason).toBeTruthy();
      expect(usePortfolioStore.getState().cashBalance).toBe(990_000);
    });
  });

  describe('FavoritesStore', () => {
    it('alterna (toggle) tickers favoritos sin duplicados', () => {
      useFavoritesStore.getState().toggleFavorite('alua');
      expect(useFavoritesStore.getState().favorites).toEqual(['ALUA']);
      expect(useFavoritesStore.getState().isFavorite('ALUA')).toBe(true);

      useFavoritesStore.getState().toggleFavorite('GGAL');
      expect(useFavoritesStore.getState().favorites).toEqual(['ALUA', 'GGAL']);

      // Toggle de nuevo sobre ALUA lo elimina
      useFavoritesStore.getState().toggleFavorite('ALUA');
      expect(useFavoritesStore.getState().favorites).toEqual(['GGAL']);
      expect(useFavoritesStore.getState().isFavorite('ALUA')).toBe(false);
    });
  });

  describe('SettingsStore', () => {
    it('persiste la preferencia de tema visual (light | dark | system)', () => {
      expect(useSettingsStore.getState().themePreference).toBe('system');

      useSettingsStore.getState().setThemePreference('dark');
      expect(useSettingsStore.getState().themePreference).toBe('dark');

      useSettingsStore.getState().setThemePreference('light');
      expect(useSettingsStore.getState().themePreference).toBe('light');
    });
  });
});
