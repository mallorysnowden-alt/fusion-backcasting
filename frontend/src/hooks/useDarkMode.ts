import { useState, useEffect, useCallback } from 'react';

function getStoredPreference(): boolean | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('darkMode');
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return null;
}

function getSystemPreference(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDarkMode(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = getStoredPreference();
    if (stored !== null) return stored;
    return getSystemPreference();
  });

  // Apply dark mode class on state change and persist
  useEffect(() => {
    applyDarkMode(isDark);
    localStorage.setItem('darkMode', String(isDark));
  }, [isDark]);

  const toggle = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  return { isDark, toggle, setIsDark };
}
