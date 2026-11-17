import React from 'react';
import { useDependencies } from '../../../app/di/DependenciesProvider';
import type { MainTabScreenProps } from '../../navigation/types';
import { ScreenPlaceholder } from '../../shared/components';

type Props = MainTabScreenProps<'Orders'>;

export function OrdersScreen(_props: Props) {
  const dependencies = useDependencies();

  return (
    <ScreenPlaceholder
      title="Órdenes"
      subtitle="Órdenes enviadas y tenencia (portfolio)"
      checks={[
        // orderRepository / portfolioRepository se registrarán en app/di en el próximo paso.
        { label: 'orderRepository', resolved: 'orderRepository' in dependencies },
        { label: 'portfolioRepository', resolved: 'portfolioRepository' in dependencies },
      ]}
    />
  );
}
