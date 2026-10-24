import { supabase, formatSize, esc } from './config.js?v=2';

const grid = document.getElementById('apps');
const filtersBox = document.getElementById('filters');

if (!grid) {
  document.body.innerHTML = '<div style="color:red;padding:20px">ОШИБКА: #apps не найден</div>';
  throw new Error('no #apps');
}

grid.innerHTML = '<div class="empty">Загрузка…</div>';

let currentCat = null;
let allApps = [];

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Таймаут: ' + label)), ms)
    )
  ]);
}

async function loadApps() {
  try {
    const result = await withTimeout(
      supabase
        .from('apps')
        .select('id, name, slug, author, author_profile_id, icon_url, size_bytes, version, downloads, created_at, download_url, app_categories(category_id)')
        .eq('status', 'published')
        .order('created_at', { ascending: false }),
      30000,
      'приложения'
    );

    if (result.error) {
      grid.innerHTML = '<div style="color:red;padding:20px">Ошибка: ' + result.error.message + '</div>';
      return;
    }

    allApps = result.data || [];
    renderApps();
  } catch (e) {
    grid.innerHTML = '<div style="color:red;padding:20px">Ошибка: ' + e.message + '</div>';
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
    const result = await withTimeout(
      supabase.from('categories').select('*').order('sort_order'),
      30000,
      'категории'
    );

    if (result.error) return;

    const cats = result.data || [];
    filtersBox.innerHTML = `
      <button class="filter-btn active" data-cat="">Все</button>
      ${cats.map(c => `<button class="filter-btn" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}
    `;

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
