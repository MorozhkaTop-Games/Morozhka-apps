import { supabase, formatSize, esc } from './config.js';

const grid = document.getElementById('apps');
const filtersBox = document.getElementById('filters');
let categories = [];
let currentCat = null;

async function init() {
  const { data: cats } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');

  categories = cats || [];

  filtersBox.innerHTML = `
    <button class="filter-btn active" data-cat="">Все</button>
    ${categories.map(c => `
      <button class="filter-btn" data-cat="${c.id}">${esc(c.name)}</button>
    `).join('')}
  `;

  filtersBox.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filtersBox.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.cat || null;
      loadApps();
    });
  });

  loadApps();
}

async function loadApps() {
  grid.innerHTML = '<div class="empty">Загрузка…</div>';

  const { data, error } = await supabase
    .from('apps')
    .select('id, name, slug, author, author_profile_id, icon_url, size_bytes, version, downloads, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    grid.innerHTML = '<div class="empty">Ошибка загрузки</div>';
    return;
  }

  const apps = data || [];

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
        </div>
      </div>
    </a>
  `).join('');
}

  let apps = data || [];

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
        </div>
      </div>
    </a>
  `).join('');
}

init();
