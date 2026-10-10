import { useEffect, useState } from 'react';
import type { JSX } from 'react';

type Theme = 'light' | 'dark';
function savedTheme(): Theme | undefined {
  try {
    const value = localStorage.getItem('warden.theme');
    return value === 'light' || value === 'dark' ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Use the system theme until the user saves a preference. */
export function ThemeToggle(): JSX.Element {
  const [preferred, setPreferred] = useState(savedTheme);
  const [system, setSystem] = useState<Theme>(() =>
    matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );
  const theme = preferred ?? system;
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = (event: MediaQueryListEvent) => setSystem(event.matches ? 'dark' : 'light');
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
  }, [theme]);
  const label = theme === 'dark' ? 'Use light theme' : 'Use dark theme';
  return (
    <button
      id="theme-toggle"
      className="theme-toggle"
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setPreferred(next);
        try {
          localStorage.setItem('warden.theme', next);
        } catch {
          /* The current tab still uses the selected theme. */
        }
      }}
    >
      <svg className="theme-moon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.5 13.2A8.6 8.6 0 0 1 10.8 3.5 8.6 8.6 0 1 0 20.5 13.2Z" />
      </svg>
      <svg className="theme-sun" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </svg>
    </button>
  );
}
