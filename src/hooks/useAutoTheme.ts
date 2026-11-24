import {useEffect, useState} from 'react';
import {safeStorageGet, safeStorageSet} from '../utils/security';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_KEY = 'spark_office_theme_pref';

export function useAutoTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    safeStorageGet<ThemePreference>(THEME_KEY, 'system')
  );
  const [resolvedDark, setResolvedDark] = useState<boolean>(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark = preference === 'dark' || (preference === 'system' && media.matches);
      setResolvedDark(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();
    safeStorageSet(THEME_KEY, preference);

    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [preference]);

  const cycleTheme = () => {
    setPreference((prev) => {
      if (prev === 'system') return resolvedDark ? 'light' : 'dark';
      if (prev === 'dark') return 'light';
      return 'dark';
    });
  };

  return {
    preference,
    resolvedDark,
    setPreference,
    cycleTheme,
  };
}
