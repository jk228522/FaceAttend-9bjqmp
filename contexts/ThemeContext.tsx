// Theme Context — Dark/Light mode toggle

import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { getSetting, setSetting } from '@/services/DatabaseService';
import { Colors } from '@/constants/theme';

export type ThemeMode = 'dark' | 'light';

export type ThemeColors = typeof Colors;

export type ThemeContextType = {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function buildColors(mode: ThemeMode): ThemeColors {
  if (mode === 'light') {
    return {
      ...Colors,
      bg: Colors.light.bg,
      bgSurface: Colors.light.bgSurface,
      bgElevated: Colors.light.bgElevated,
      bgCard: Colors.light.bgCard,
      bgInput: Colors.light.bgInput,
      border: Colors.light.border,
      borderLight: Colors.light.borderLight,
      textPrimary: Colors.light.textPrimary,
      textSecondary: Colors.light.textSecondary,
      textMuted: Colors.light.textMuted,
    };
  }
  return Colors;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    getSetting('dark_mode').then((val) => {
      if (val === 'false') setMode('light');
      else setMode('dark');
    }).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      setSetting('dark_mode', next === 'dark' ? 'true' : 'false').catch(() => {});
      return next;
    });
  }, []);

  const colors = buildColors(mode);

  return (
    <ThemeContext.Provider value={{ mode, colors, isDark: mode === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
