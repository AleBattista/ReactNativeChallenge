import React from 'react';
import { useDependencies } from '../../../app/di/DependenciesProvider';
import type { MainTabScreenProps } from '../../navigation/types';
import { ScreenPlaceholder } from '../../shared/components';

type Props = MainTabScreenProps<'Favorites'>;

export function FavoritesScreen(_props: Props) {
  // Favoritos = subconjunto del mercado: reutiliza el mismo QuoteFeed.
  const { quoteFeed } = useDependencies();

  return (
    <ScreenPlaceholder
      title="Favoritos"
      subtitle="Activos seguidos por el usuario"
      checks={[{ label: 'quoteFeed', resolved: typeof quoteFeed.subscribe === 'function' }]}
    />
  );
}
