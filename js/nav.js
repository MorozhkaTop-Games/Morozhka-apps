import { getSession } from './session.js';

function init() {
  const link = document.querySelector('nav a[href="account.html"], nav a[href="login.html"]');
  if (link) {
    if (getSession()) { link.textContent = 'Профиль'; link.href = 'account.html'; }
    else { link.textContent = 'Войти'; link.href = 'login.html'; }
  }

  const backBtn = document.createElement('button');
  backBtn.className = 'back-to-top';
  backBtn.textContent = '↑';
  backBtn.setAttribute('aria-label', 'Наверх');
  document.body.appendChild(backBtn);

  let raf = null;
  window.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      backBtn.classList.toggle('visible', window.scrollY > 400);
      raf = null;
    });
  }, { passive: true });

  backBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
