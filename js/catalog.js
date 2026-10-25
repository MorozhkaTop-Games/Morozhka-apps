import { dbSelect, dbRpc } from './api.js';

const grid = document.getElementById('apps');
const filtersBox = document.getElementById('filters');
let currentCat = null;
let allApps = [];

const formatSize = b => !b ? '—' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function starsHtml(avg, count) {
  if (!count) return '<span style="color:var(--muted-2);font-size:12px">нет оценок</span>';
  const full = Math.round(avg);
  return `<span class="review-stars">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span> <span style="color:var(--muted);font-size:11px">${avg.toFixed(1)} (${count})</span>`;
}

async function loadApps() {
  if (!grid) return;

  let cached = null;
  try {
    const raw = localStorage.getItem('cache_apps');
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && obj.apps) cached = obj.apps;
    }
  } catch {}

  if (cached && cached.length) {
    allApps = cached;
    renderApps();
  } else {
    grid.innerHTML = '<div class="empty">Загрузка…</div>';
  }

  try {
    const apps = await dbSelect(
      'apps',
      'select=id,name,slug,author,author_profile_id,icon_url,size_bytes,version,downloads,created_at,download_url,description,screenshots,install_instructions,has_ads,has_iap,age_rating,status,author_profile:profiles!author_profile_id(slug),app_categories(category_id)&status=eq.published&order=created_at.desc'
    );
    if (apps && apps.length) {
      allApps = apps;
      try {
        localStorage.setItem('cache_apps', JSON.stringify({ t: Date.now(), apps }));
        apps.forEach(a => {
          if (a.slug) localStorage.setItem('app_' + a.slug, JSON.stringify(a));
        });
      } catch {}
      renderApps();
      // рейтинг — параллельно, не блокирует
      loadRatings();
    }
  } catch (e) {
    console.warn('Каталог:', e.message);
    if (!cached) grid.innerHTML = '<div class="empty">Не удалось загрузить. Проверьте интернет.</div>';
  }
}

async function loadRatings() {
  // Для каждого приложения — get_app_rating, параллельно
  const promises = allApps.map(async (a) => {
    try {
      const r = await dbRpc('get_app_rating', { p_app_id: a.id });
      if (r && r.count > 0) {
        a.rating_avg = r.avg;
        a.rating_count = r.count;
      } else {
        a.rating_avg = 0;
        a.rating_count = 0;
      }
    } catch {
      a.rating_avg = 0;
      a.rating_count = 0;
    }
  });
  await Promise.all(promises);
  try {
    localStorage.setItem('cache_apps', JSON.stringify({ t: Date.now(), apps: allApps }));
    allApps.forEach(a => { if (a.slug) localStorage.setItem('app_' + a.slug, JSON.stringify(a)); });
  } catch {}
  renderApps();
}

function renderApps() {
  if (!grid) return;
  let apps = allApps;
  if (currentCat) apps = apps.filter(a => (a.app_categories || []).some(ac => ac.category_id === currentCat));
  if (!apps.length) { grid.innerHTML = '<div class="empty">В этом разделе пока пусто</div>'; return; }
  grid.innerHTML = apps.map(a => {
    const author = a.author_profile && a.author_profile.slug
      ? `<a href="profile.html?u=${encodeURIComponent(a.author_profile.slug)}">${esc(a.author)}</a>`
      : esc(a.author);
    return `
    <a href="app.html?slug=${encodeURIComponent(a.slug || a.id)}" class="app-card">
      <img class="icon" src="${esc(a.icon_url) || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E'}" alt="" loading="lazy" decoding="async" width="56" height="56">
      <div class="body">
        <h3>${esc(a.name)}</h3>
        <div class="author">${author}</div>
        <div class="meta">
          ${a.version ? `<span>v${esc(a.version)}</span>` : ''}
          <span>${formatSize(a.size_bytes)}</span>
          <span>${a.downloads} ↓</span>
          ${a.rating_count > 0 ? `<span>${starsHtml(a.rating_avg || 0, a.rating_count)}</span>` : ''}
          ${!a.download_url ? '<span class="soon">Скоро</span>' : ''}
        </div>
      </div>
    </a>`;
  }).join('');
}

async function loadCategories() {
  if (!filtersBox) return;
  const raw = localStorage.getItem('cache_cats');
  if (raw) try {
    const cats = JSON.parse(raw);
    if (cats && cats.length) { renderCats(cats); }
  } catch {}
  try {
    const cats = await dbSelect('categories', 'select=*&order=sort_order');
    if (cats && cats.length) {
      localStorage.setItem('cache_cats', JSON.stringify(cats));
      renderCats(cats);
    }
  } catch (e) { console.warn('Категории:', e.message); }
}

function renderCats(cats) {
  filtersBox.innerHTML = '<button class="filter-btn active" data-cat="">Все</button>' +
    cats.map(c => `<button class="filter-btn" data-cat="${esc(c.id)}">${esc(c.name)}</button>`).join('');
  filtersBox.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filtersBox.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.cat || null;
      renderApps();
    });
  });
}

loadApps();
loadCategories();
