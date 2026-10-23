import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, formatSize, esc } from './config.js';

// ВСТАВЬ СЮДА
const ADMIN_PASSWORD = 'Mjdkj18928_sdjksj338___76273hsxuhdsjnxjchskdjsdhkjsudk';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrc2JxZGRza2xkbmFhZmV2bW5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5Mjc3NzE2MSwiZXhwIjoyMTA4MzUzMTYxfQ._Y1LT-MqInNtxrM_k8JgjjUmQy-t7JqoT8aNc4WDnGY';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

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
  loadCategories();
  loadApps();
  loadReviews();
  loadProfiles();
}

if (sessionStorage.getItem('admin') === '1') showAdmin();

const tabs = document.querySelectorAll('.admin-tab');
const tabIds = ['add', 'apps', 'reviews', 'categories', 'profiles'];
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    tabIds.forEach(id => {
      document.getElementById('tab-' + id).classList.toggle('hidden', id !== tab.dataset.tab);
    });
  });
});

let categoriesCache = [];

async function loadCategories() {
  const { data } = await admin.from('categories').select('*').order('sort_order');
  categoriesCache = data || [];

  const cbBox = document.getElementById('categoryCheckboxes');
  cbBox.innerHTML = categoriesCache.map(c => `
    <label class="checkbox-row" style="width:auto;padding:6px 12px">
      <input type="checkbox" value="${c.id}" name="category_ids">
      <span>${esc(c.name)}</span>
    </label>
  `).join('');

  const listBox = document.getElementById('catsList');
  listBox.innerHTML = categoriesCache.length
    ? categoriesCache.map(c => `
      <div class="admin-item">
        <div class="grow">
          <h4>${esc(c.name)}</h4>
          <small>slug: ${esc(c.slug)}</small>
        </div>
        <div class="actions">
          <button class="btn btn-danger btn-sm" data-del-cat="${c.id}">Удалить</button>
        </div>
      </div>
    `).join('')
    : '<div class="empty">Нет категорий</div>';

  listBox.querySelectorAll('[data-del-cat]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Удалить категорию?')) return;
      await admin.from('categories').delete().eq('id', btn.dataset.delCat);
      loadCategories();
    });
  });
}

document.getElementById('catForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = e.target.name.value.trim();
  if (!name) return;
  const slug = name.toLowerCase().replace(/[^a-z0-9а-я]+/gi, '-').replace(/^-|-$/g, '');
  const { error } = await admin.from('categories').insert({ name, slug });
  if (error) alert('Ошибка: ' + error.message);
  else { e.target.reset(); loadCategories(); }
});

let profilesCache = [];

async function loadProfiles() {
  const { data } = await admin.from('profiles').select('*').order('created_at', { ascending: false });
  profilesCache = data || [];

  const sel = document.getElementById('authorProfileSelect');
  sel.innerHTML = '<option value="">— без профиля —</option>' +
    profilesCache.map(p => `<option value="${p.id}">${esc(p.display_name)} (@${esc(p.slug)})</option>`).join('');

  const listBox = document.getElementById('profilesList');
  listBox.innerHTML = profilesCache.length
    ? profilesCache.map(p => `
      <div class="admin-item">
        <img src="${p.avatar_url || ''}" alt="">
        <div class="grow">
          <h4>${esc(p.display_name)}</h4>
          <small>@${esc(p.slug)} · ${p.account_id ? 'зарегистрирован' : 'создан вручную'} · <a href="profile.html?u=${p.slug}" target="_blank">открыть</a></small>
        </div>
        <div class="actions">
          <button class="btn btn-danger btn-sm" data-del-profile="${p.id}">Удалить</button>
        </div>
      </div>
    `).join('')
    : '<div class="empty">Пока никто не зарегистрировался</div>';

  listBox.querySelectorAll('[data-del-profile]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Удалить профиль? Приложения останутся, но автор станет некликабельным.')) return;
      await admin.from('profiles').delete().eq('id', btn.dataset.delProfile);
      loadProfiles();
    });
  });
}

async function loadApps() {
  const box = document.getElementById('appsList');
  const { data } = await admin
    .from('apps')
    .select('*, app_categories ( category_id, categories ( name ) )')
    .order('created_at', { ascending: false });

  if (!data || !data.length) {
    box.innerHTML = '<div class="empty">Нет приложений</div>';
    return;
  }

  box.innerHTML = data.map(app => {
    const cats = (app.app_categories || []).map(ac => ac.categories?.name).filter(Boolean);
    return `
      <div class="admin-item">
        <img src="${app.icon_url || ''}" alt="">
        <div class="grow">
          <h4>${esc(app.name)}</h4>
          <small>${esc(app.author)} · ${cats.join(', ') || '—'} · ${app.downloads} ↓ · ${formatSize(app.size_bytes)}</small>
        </div>
        <div class="actions">
          <a href="app.html?slug=${app.slug || app.id}" target="_blank" class="btn btn-ghost btn-sm">Открыть</a>
          <button class="btn btn-danger btn-sm" data-del="${app.id}">Удалить</button>
        </div>
      </div>
    `;
  }).join('');

  box.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Удалить приложение?')) return;
      await admin.from('apps').delete().eq('id', btn.dataset.del);
      loadApps();
    });
  });
}

document.getElementById('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const statusEl = document.getElementById('addStatus');

  const selectedCats = [...e.target.querySelectorAll('input[name="category_ids"]:checked')]
    .map(cb => cb.value);

  if (!selectedCats.length) {
    statusEl.textContent = 'Выберите хотя бы одну категорию';
    statusEl.style.color = 'var(--danger)';
    return;
  }

  statusEl.textContent = 'Публикация…';
  statusEl.style.color = 'var(--muted)';

  const sizeMb = parseFloat(fd.get('size_mb'));
  const screenshots = (fd.get('screenshots') || '')
    .split('\n').map(s => s.trim()).filter(Boolean);

  const { data: inserted, error } = await admin.from('apps').insert({
    name: fd.get('name'),
    slug: fd.get('slug').toLowerCase(),
    author: fd.get('author'),
    author_profile_id: fd.get('author_profile_id') || null,
    description: fd.get('description'),
    version: fd.get('version') || null,
    size_bytes: sizeMb ? Math.round(sizeMb * 1024 * 1024) : null,
    icon_url: fd.get('icon_url') || null,
    screenshots: screenshots,
    download_url: fd.get('download_url'),
    install_instructions: fd.get('install_instructions') || null,
    has_ads: fd.get('has_ads') === 'true',
    has_iap: fd.get('has_iap') === 'true',
    age_rating: fd.get('age_rating'),
  }).select().single();

  if (error) {
    statusEl.textContent = 'Ошибка: ' + error.message;
    statusEl.style.color = 'var(--danger)';
    return;
  }

  const links = selectedCats.map(catId => ({ app_id: inserted.id, category_id: catId }));
  const { error: linkErr } = await admin.from('app_categories').insert(links);

  if (linkErr) {
    statusEl.textContent = 'Ошибка категорий: ' + linkErr.message;
    statusEl.style.color = 'var(--danger)';
  } else {
    statusEl.textContent = 'Опубликовано!';
    statusEl.style.color = 'var(--success)';
    e.target.reset();
    loadApps();
  }
});

async function loadReviews() {
  const box = document.getElementById('reviewsList');
  const { data } = await admin
    .from('reviews').select('*, apps(name)')
    .order('created_at', { ascending: false });

  if (!data || !data.length) {
    box.innerHTML = '<div class="empty">Нет отзывов</div>';
    return;
  }

  box.innerHTML = data.map(r => `
    <div class="admin-item" style="align-items:flex-start">
      <div class="grow">
        <h4>${esc(r.name)} · ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</h4>
        <small>${esc(r.apps?.name || '—')} · ${r.status === 'pending' ? 'Ожидает' : r.status === 'approved' ? 'Одобрен' : 'Отклонён'}</small>
        <div style="margin-top:8px;font-size:14px">${esc(r.text)}</div>
      </div>
      <div class="actions">
        ${r.status !== 'approved' ? `<button class="btn btn-success btn-sm" data-approve="${r.id}">Одобрить</button>` : ''}
        <button class="btn btn-danger btn-sm" data-reject="${r.id}">Удалить</button>
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
      if (!confirm('Удалить отзыв?')) return;
      await admin.from('reviews').delete().eq('id', btn.dataset.reject);
      loadReviews();
    });
  });
}
