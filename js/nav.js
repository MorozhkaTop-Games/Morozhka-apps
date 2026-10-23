import { getSession } from './session.js';

document.addEventListener('DOMContentLoaded', () => {
  const link = document.querySelector('nav a[href="account.html"]');
  if (!link) return;

  if (getSession()) {
    link.textContent = 'Профиль';
    link.href = 'account.html';
  } else {
    link.textContent = 'Войти';
    link.href = 'login.html';
  }
});
