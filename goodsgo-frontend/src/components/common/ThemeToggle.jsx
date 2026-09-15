import useThemeStore from '../../stores/useThemeStore';

/**
 * Animated day/night theme switch.
 *
 * A single accessible toggle (role="switch") that flips the app between light
 * and dark mode. The knob morphs between a sun and a crescent moon, stars fade
 * in at night and a cloud drifts in by day. All motion is CSS-only, honours
 * `prefers-reduced-motion`, and the styling lives in index.css (`.theme-switch`).
 *
 * Colours are intentionally self-contained (sky-blue day / midnight night) since
 * the control depicts the theme itself — this reads correctly on both surfaces.
 */
export default function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      data-mode={isDark ? 'dark' : 'light'}
      className="theme-switch"
    >
      <span className="theme-switch__star theme-switch__star--1" />
      <span className="theme-switch__star theme-switch__star--2" />
      <span className="theme-switch__star theme-switch__star--3" />

      <svg className="theme-switch__cloud" viewBox="0 0 16 10" aria-hidden="true">
        <path d="M4.5 9.5a3 3 0 0 1-.3-5.98 3.5 3.5 0 0 1 6.7-.7 2.6 2.6 0 0 1 .6 6.68H4.5Z" />
      </svg>

      <span className="theme-switch__knob" />
    </button>
  );
}
