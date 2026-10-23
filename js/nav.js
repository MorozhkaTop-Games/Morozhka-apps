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
// кнопка "наверх"
const backBtn = document.createElement('button');
backBtn.className = 'back-to-top';
backBtn.textContent = '↑';
backBtn.setAttribute('aria-label', 'Наверх');
document.body.appendChild(backBtn);

window.addEventListener('scroll', () => {
  backBtn.classList.toggle('visible', window.scrollY > 400);
});

backBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
