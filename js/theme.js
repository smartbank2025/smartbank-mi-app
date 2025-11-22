let currentTheme = localStorage.getItem('theme') || 'light';

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', currentTheme);
  applyTheme();
  updateThemeButton();
}

function updateThemeButton() {
  const button = document.querySelector('.theme-button');
  if (button) {
    button.textContent = currentTheme === 'light' ? '🌙' : '☀️';
  }
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  updateThemeButton();
});