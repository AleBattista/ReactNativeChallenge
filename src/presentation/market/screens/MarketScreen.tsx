import React from 'react';
import { useDependencies } from '../../../app/di/DependenciesProvider';
import type { MainTabScreenProps } from '../../navigation/types';
import { AppButton, ScreenPlaceholder } from '../../shared/components';

type Props = MainTabScreenProps<'Market'>;

export function MarketScreen({ navigation }: Props) {
  const { marketRepository, quoteFeed } = useDependencies();

  return (
    <ScreenPlaceholder
      title="Mercado"
      subtitle="Listado de activos con precios en vivo"
      checks={[
        { label: 'marketRepository', resolved: typeof marketRepository.getAssets === 'function' },
        { label: 'quoteFeed', resolved: typeof quoteFeed.subscribe === 'function' },
      ]}>
      {/* Demo de navegación tipada: tab → modal del stack raíz con params. */}
      <AppButton
        label="Abrir OrderModal (ALUA)"
        accessibilityHint="Abre el modal de orden de prueba"
        onPress={() => navigation.navigate('OrderModal', { symbol: 'ALUA', side: 'BUY' })}
      />
    </ScreenPlaceholder>
  );
}
