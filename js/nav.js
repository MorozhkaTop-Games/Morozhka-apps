import { getSession } from './session.js?v=2';

document.addEventListener('DOMContentLoaded', () => {
  const link = document.querySelector('nav a[href="account.html"]');
  if (link) {
    if (getSession()) {
      link.textContent = 'Профиль';
      link.href = 'account.html';
    } else {
      link.textContent = 'Войти';
      link.href = 'login.html';
    }
  }

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
});
