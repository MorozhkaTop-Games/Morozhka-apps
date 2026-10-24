// было: при ошибке без кеша показывался e.message ("timeout")
// стало: человеческий текст
import { dbSelect } from './api.js';

const grid = document.getElementById('apps');
const filtersBox = document.getElementById('filters');

if (!grid) {
  document.body.innerHTML = '<div style="color:red;padding:20px">ОШИБКА: #apps не найден</div>';
  throw new Error('no #apps');
}

grid.innerHTML = '<div class="empty">Загрузка…</div>';

let currentCat = null;
let allApps = [];

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function loadApps() {
  const cached = localStorage.getItem('cache_apps');
  if (cached) {
    try {
      const apps = JSON.parse(cached);
      if (apps && apps.length) { allApps = apps; renderApps(); }
    } catch (e) {}
  }
  try {
    const apps = await dbSelect('apps',
      'select=id,name,slug,author,author_profile_id,icon_url,size_bytes,version,downloads,created_at,download_url,app_categories(category_id)&status=eq.published&order=created_at.desc');
    allApps = apps || [];
    localStorage.setItem('cache_apps', JSON.stringify(allApps));
    renderApps();
  } catch (e) {
    if (!cached) {
      grid.innerHTML = '<div class="empty">Не удалось загрузить. Проверьте интернет и обновите страницу.</div>';
    }
  }
}

function renderApps() {
  let apps = allApps;
  if (currentCat) {
    apps = apps.filter(app =>
      (app.app_categories || []).some(ac => ac.category_id === currentCat)
    );
  }
  if (!apps.length) {
    grid.innerHTML = '<div class="empty">В этом разделе пока пусто</div>';
    return;
  }
  grid.innerHTML = apps.map(app => `
    <a href="app.html?slug=${app.slug || app.id}" class="app-card">
      <img class="icon" src="${app.icon_url || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E'}" alt="" loading="lazy">
      <div class="body">
        <h3>${esc(app.name)}</h3>
        <div class="author">${esc(app.author)}</div>
        <div class="meta">
          ${app.version ? `<span>v${esc(app.version)}</span>` : ''}
          <span>${formatSize(app.size_bytes)}</span>
          <span>${app.downloads} ↓</span>
          ${!app.download_url ? `<span class="soon">Скоро</span>` : ''}
        </div>
      </div>
    </a>
  `).join('');
}

async function loadCategories() {
  try {
    const cats = await dbSelect('categories', 'select=*&order=sort_order');
    filtersBox.innerHTML = `<button class="filter-btn active" data-cat="">Все</button>` +
      cats.map(c => `<button class="filter-btn" data-cat="${c.id}">${esc(c.name)}</button>`).join('');
    filtersBox.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filtersBox.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCat = btn.dataset.cat || null;
        renderApps();
      });
    });
  } catch (e) {
    console.warn('Категории:', e.message);
  }
}

loadApps();
loadCategories();
