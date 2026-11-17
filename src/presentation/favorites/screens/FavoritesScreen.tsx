import React from 'react';
import { useDependencies } from '../../../app/di/DependenciesProvider';
import type { MainTabScreenProps } from '../../navigation/types';
import { ScreenPlaceholder } from '../../shared/components/ScreenPlaceholder';

type Props = MainTabScreenProps<'Favorites'>;

export function FavoritesScreen(_props: Props) {
  const { quoteFeed } = useDependencies();

  return (
    <ScreenPlaceholder
      title="Favoritos"
      subtitle="Activos seguidos por el usuario"
      checks={[
        {
          label: 'quoteFeed',
          resolved: typeof quoteFeed?.subscribe === 'function',
        },
      ]}
    />
  );
}

export default FavoritesScreen;
