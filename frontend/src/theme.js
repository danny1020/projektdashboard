const THEME_STORAGE_KEY = 'projectHubTheme';
const DEFAULT_THEME = 'dark';

export function getSavedTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
}

export function applyTheme(theme) {
  const nextTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  window.dispatchEvent(new CustomEvent('themechange', { detail: nextTheme }));
  return nextTheme;
}

export function initTheme() {
  applyTheme(getSavedTheme());
}
