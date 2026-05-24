// admin/src/lib/theme.ts
// Hook para alternar entre tema oscuro y claro.
// Lee la preferencia desde localStorage; aplica data-theme="light" en <html>.
// El tema oscuro es el default (sin atributo); claro requiere data-theme="light".

import { useCallback, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';
const KEY = 'acacia.admin.theme';

function getStored(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch { /* noop */ }
  // Si el sistema prefiere claro, arrancar en claro
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function apply(theme: Theme) {
  if (theme === 'light') {
    document.documentElement.dataset.theme = 'light';
  } else {
    delete document.documentElement.dataset.theme;
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const t = getStored();
    apply(t);
    return t;
  });

  // Sincronizar al montar (por si el estado inicial no disparó el useLayoutEffect)
  useEffect(() => { apply(theme); }, [theme]);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, next); } catch { /* noop */ }
      apply(next);
      return next;
    });
  }, []);

  return { theme, toggle, isDark: theme === 'dark' };
}
