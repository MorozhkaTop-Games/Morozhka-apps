import { dbSelect } from './api.js';

const grid = document.getElementById('apps');
const filtersBox = document.getElementById('filters');
let currentCat = null;
let allApps = [];

const formatSize = b => {
  if (!b) return '—';
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

async function loadApps() {
  if (!grid) return;

  const cached = localStorage.getItem('cache_apps');
  if (cached) {
    try {
      const c = JSON.parse(cached);
      if (Array.isArray(c) && c.length) { allApps = c; renderApps(); }
    } catch {}
  }

  try {
    const apps = await dbSelect(
      'apps',
      'select=id,name,slug,author,author_profile_id,icon_url,size_bytes,version,downloads,created_at,download_url,app_categories(category_id)&status=eq.published&order=created_at.desc'
    );
    allApps = apps || [];
    try { localStorage.setItem('cache_apps', JSON.stringify(allApps)); } catch {}
    renderApps();
  } catch (e) {
    if (!cached) grid.innerHTML = '<div class="empty">Не удалось загрузить. Проверьте интернет и обновите страницу.</div>';
  }
}

function renderApps() {
  if (!grid) return;
  let apps = allApps;
  if (currentCat) apps = apps.filter(a => (a.app_categories || []).some(ac => ac.category_id === currentCat));
  if (!apps.length) { grid.innerHTML = '<div class="empty">В этом разделе пока пусто</div>'; return; }

  grid.innerHTML = apps.map(a => `
    <a href="app.html?slug=${encodeURIComponent(a.slug || a.id)}" class="app-card">
      <img class="icon" src="${esc(a.icon_url) || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E'}" alt="" loading="lazy" decoding="async">
      <div class="body">
        <h3>${esc(a.name)}</h3>
        <div class="author">${esc(a.author)}</div>
        <div class="meta">
          ${a.version ? `<span>v${esc(a.version)}</span>` : ''}
          <span>${formatSize(a.size_bytes)}</span>
          <span>${a.downloads} ↓</span>
          ${!a.download_url ? '<span class="soon">Скоро</span>' : ''}
        </div>
      </div>
    </a>`).join('');
}

async function loadCategories() {
  if (!filtersBox) return;
  try {
    const cats = await dbSelect('categories', 'select=*&order=sort_order');
    filtersBox.innerHTML = '<button class="filter-btn active" data-cat="">Все</button>' +
      (cats || []).map(c => `<button class="filter-btn" data-cat="${esc(c.id)}">${esc(c.name)}</button>`).join('');
    filtersBox.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filtersBox.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCat = btn.dataset.cat || null;
        renderApps();
      });
    });
  } catch (e) { console.warn('Категории:', e.message); }
}

loadApps();
loadCategories();
