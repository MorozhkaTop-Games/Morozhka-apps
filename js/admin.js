import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, formatSize, esc } from './config.js';

// ВСТАВЬ СЮДА
const ADMIN_PASSWORD = 'Mjdkj18928_sdjksj338___76273hsxuhdsjnxjchskdjsdhkjsudk';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrc2JxZGRza2xkbmFhZmV2bW5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5Mjc3NzE2MSwiZXhwIjoyMTA4MzUzMTYxfQ._Y1LT-MqInNtxrM_k8JgjjUmQy-t7JqoT8aNc4WDnGY';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// ===== Вход =====
const loginScreen = document.getElementById('loginScreen');
const adminScreen = document.getElementById('adminScreen');
const loginBtn = document.getElementById('loginBtn');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');

loginBtn.addEventListener('click', () => {
  if (passwordInput.value === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin', '1');
    showAdmin();
  } else {
    loginError.classList.remove('hidden');
  }
});

function showAdmin() {
  loginScreen.classList.add('hidden');
  adminScreen.classList.remove('hidden');
  loadApps();
  loadReviews();
}

if (sessionStorage.getItem('admin') === '1') showAdmin();

// ===== Вкладки =====
const tabs = document.querySelectorAll('.admin-tab');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    ['apps', 'reviews', 'add'].forEach(name => {
      document.getElementById('tab-' + name).classList.toggle('hidden', name !== tab.dataset.tab);
    });
  });
});

// ===== Приложения =====
async function loadApps() {
  const box = document.getElementById('appsList');
  const { data } = await admin.from('apps').select('*').order('created_at', { ascending: false });
  if (!data || !data.length) { box.innerHTML = '<div class="empty">Нет приложений</div>'; return; }
  box.innerHTML = data.map(app => `
    <div class="admin-list-item">
      <img src="${app.icon_url || ''}" alt="">
      <div class="grow">
        <h4>${esc(app.name)}</h4>
        <small>${esc(app.author)} · ${app.category === 'games' ? 'Игра' : 'APK'} · ${app.downloads} скачиваний</small>
      </div>
      <div class="actions">
        <button class="btn btn-danger" data-del="${app.id}">Удалить</button>
      </div>
    </div>
  `).join('');

  box.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Удалить приложение?')) return;
      await admin.from('apps').delete().eq('id', btn.dataset.del);
      loadApps();
    });
  });
}

// ===== Отзывы =====
async function loadReviews() {
  const box = document.getElementById('reviewsList');
  const { data } = await admin.from('reviews').select('*, apps(name)').order('created_at', { ascending: false });
  if (!data || !data.length) { box.innerHTML = '<div class="empty">Нет отзывов</div>'; return; }
  box.innerHTML = data.map(r => `
    <div class="admin-list-item" style="align-items:flex-start">
      <div class="grow">
        <h4>${esc(r.name)} · ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</h4>
        <small>Приложение: ${esc(r.apps?.name || '—')}</small>
        <div style="margin-top:8px;font-size:14px">${esc(r.text)}</div>
        <div style="margin-top:8px">
          <span class="tag">${r.status === 'pending' ? 'Ожидает' : r.status === 'approved' ? 'Одобрен' : 'Отклонён'}</span>
        </div>
      </div>
      <div class="actions">
        ${r.status !== 'approved' ? `<button class="btn btn-success" data-approve="${r.id}">Одобрить</button>` : ''}
        <button class="btn btn-danger" data-reject="${r.id}">Удалить</button>
      </div>
    </div>
  `).join('');

  box.querySelectorAll('[data-approve]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await admin.from('reviews').update({ status: 'approved' }).eq('id', btn.dataset.approve);
      loadReviews();
    });
  });
  box.querySelectorAll('[data-reject]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await admin.from('reviews').delete().eq('id', btn.dataset.reject);
      loadReviews();
    });
  });
}

// ===== Добавление =====
document.getElementById('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const statusEl = document.getElementById('addStatus');
  statusEl.textContent = 'Публикация…';
  statusEl.style.color = 'var(--muted)';

  const sizeMb = parseFloat(fd.get('size_mb'));
  const { error } = await admin.from('apps').insert({
    name: fd.get('name'),
    author: fd.get('author'),
    category: fd.get('category'),
    version: fd.get('version') || null,
    size_bytes: sizeMb ? Math.round(sizeMb * 1024 * 1024) : null,
    icon_url: fd.get('icon_url') || null,
    download_url: fd.get('download_url'),
    description: fd.get('description'),
    install_instructions: fd.get('install_instructions') || null,
  });

  if (error) {
    statusEl.textContent = 'Ошибка: ' + error.message;
    statusEl.style.color = 'var(--danger)';
  } else {
    statusEl.textContent = 'Опубликовано!';
    statusEl.style.color = 'var(--success)';
    e.target.reset();
    loadApps();
  }
});
