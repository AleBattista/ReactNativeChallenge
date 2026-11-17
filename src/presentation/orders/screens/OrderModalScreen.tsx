import React from 'react';
import { useDependencies } from '../../../app/di/DependenciesProvider';
import type { RootStackScreenProps } from '../../navigation/types';
import { AppButton, ScreenPlaceholder } from '../../shared/components';

type Props = RootStackScreenProps<'OrderModal'>;

export function OrderModalScreen({ route, navigation }: Props) {
  // `route.params` está tipado: symbol es Ticker y side es OrderSide | undefined.
  const { symbol, side } = route.params;
  const { quoteFeed } = useDependencies();

  return (
    <ScreenPlaceholder
      title="Order Modal"
      subtitle={`${side ?? 'BUY/SELL'} · ${symbol}`}
      checks={[{ label: 'quoteFeed', resolved: typeof quoteFeed.getQuote === 'function' }]}>
      <AppButton label="Cerrar" variant="secondary" onPress={navigation.goBack} />
    </ScreenPlaceholder>
  );
}
