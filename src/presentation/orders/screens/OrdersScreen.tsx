import React from 'react';
import { useDependencies } from '../../../app/di/DependenciesProvider';
import type { MainTabScreenProps } from '../../navigation/types';
import { ScreenPlaceholder } from '../../shared/components/ScreenPlaceholder';

type Props = MainTabScreenProps<'Orders'>;

export function OrdersScreen(_props: Props) {
  const dependencies = useDependencies();

  return (
    <ScreenPlaceholder
      title="Órdenes"
      subtitle="Órdenes enviadas y tenencia (portfolio)"
      checks={[
        {
          label: 'marketRepository',
          resolved: typeof dependencies?.marketRepository?.getAssets === 'function',
        },
        {
          label: 'quoteFeed',
          resolved: typeof dependencies?.quoteFeed?.subscribe === 'function',
        },
      ]}
    />
  );
}

export default OrdersScreen;
