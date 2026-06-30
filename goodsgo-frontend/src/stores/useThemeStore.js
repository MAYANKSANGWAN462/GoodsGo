import { create } from 'zustand';

/**
 * Reads the user's saved preference from localStorage, falling back to
 * their OS preference, then finally to 'light'.
 *
 * @returns {'light'|'dark'}
 */
function getInitialTheme() {
  try {
    const saved = localStorage.getItem('gg-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    // localStorage blocked (private browsing, etc.) — fall through to default
  }
  return 'light';
}

/**
 * Applies the theme to <html> by toggling the `.dark` class and the
 * `data-theme` attribute so both Tailwind's `dark:` variant and our
 * CSS-variable overrides activate simultaneously.
 *
 * The `.theme-transitioning` class is added momentarily so all
 * background/color transitions animate during the switch.
 *
 * @param {'light'|'dark'} theme
 */
function applyTheme(theme) {
  const root = document.documentElement;

  root.classList.add('theme-transitioning');

  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }

  // Remove the transitioning class after the animation completes (220ms + buffer)
  setTimeout(() => root.classList.remove('theme-transitioning'), 280);
}

// Apply on module load so there's no flash of wrong theme
const initial = getInitialTheme();
applyTheme(initial);

/**
 * Zustand store for the application's light / dark theme.
 *
 * @returns {{ theme: 'light'|'dark', isDark: boolean, toggleTheme: function, setTheme: function }}
 */
const useThemeStore = create((set) => ({
  theme: initial,
  isDark: initial === 'dark',

  /** Toggle between light and dark. */
  toggleTheme() {
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem('gg-theme', next);
      } catch { /* ignore */ }
      return { theme: next, isDark: next === 'dark' };
    });
  },

  /**
   * Set a specific theme.
   * @param {'light'|'dark'} theme
   */
  setTheme(theme) {
    set(() => {
      applyTheme(theme);
      try {
        localStorage.setItem('gg-theme', theme);
      } catch { /* ignore */ }
      return { theme, isDark: theme === 'dark' };
    });
  },
}));

export default useThemeStore;
