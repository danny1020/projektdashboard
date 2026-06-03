import { useEffect, useState } from 'react';
import { applyTheme, getSavedTheme } from '../theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getSavedTheme);

  useEffect(() => {
    const handleThemeChange = (event) => {
      setTheme(event.detail || getSavedTheme());
    };

    window.addEventListener('themechange', handleThemeChange);
    return () => window.removeEventListener('themechange', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    setTheme(applyTheme(theme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Light Theme aktivieren' : 'Dark Theme aktivieren'}
      title={theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
    >
      <span className="theme-toggle-icon">{theme === 'dark' ? 'L' : 'D'}</span>
      <span className="theme-toggle-text">{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
