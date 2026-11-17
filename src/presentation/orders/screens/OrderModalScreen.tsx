import React from 'react';
import { useDependencies } from '../../../app/di/DependenciesProvider';
import type { RootStackScreenProps } from '../../navigation/types';
import { AppButton } from '../../shared/components/AppButton';
import { ScreenPlaceholder } from '../../shared/components/ScreenPlaceholder';

type Props = RootStackScreenProps<'OrderModal'>;

export function OrderModalScreen({ route, navigation }: Props) {
  const symbol = route.params?.symbol ?? '—';
  const side = route.params?.side;
  const { quoteFeed } = useDependencies();

  return (
    <ScreenPlaceholder
      title="Order Modal"
      subtitle={`${side ?? 'BUY/SELL'} · ${symbol}`}
      checks={[
        {
          label: 'quoteFeed',
          resolved: typeof quoteFeed?.getQuote === 'function',
        },
      ]}>
      <AppButton
        label="Cerrar"
        variant="secondary"
        onPress={navigation.goBack}
      />
    </ScreenPlaceholder>
  );
}

export default OrderModalScreen;
