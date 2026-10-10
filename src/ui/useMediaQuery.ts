import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => {
        mql.removeEventListener('change', onChange);
      };
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** ≥ 1024 px: form + live preview side by side, items as a table. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

export function useViewportHeight(): number {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('resize', onChange);
      return () => {
        window.removeEventListener('resize', onChange);
      };
    },
    () => window.innerHeight,
    () => 800,
  );
}
