import { dbSelect } from './api.js';

const grid = document.getElementById('apps');
const filtersBox = document.getElementById('filters');

if (!grid) throw new Error('no #apps');

let currentCat = null;
let allApps = [];
const CACHE_KEY = 'catalog_v3';
const CATS_CACHE_KEY = 'catalog_cats_v3';
const FETCH_TIMEOUT = 8000;
const RETRIES = 3;

const formatSize = b => !b ? '—' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function readCache(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeCache(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

async function withRetry(fn, retries = RETRIES, timeout = FETCH_TIMEOUT) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeout)),
      ]);
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastErr;
}

// Скелетон: рисуем сразу, чтобы не было пустого экрана и скачков вёрстки
function renderSkeleton() {
  grid.innerHTML = Array.from({ length: 6 }).map(() => `
    <div class="app-card app-card-skeleton" aria-hidden="true">
      <div class="icon skeleton-box"></div>
      <div class="body">
        <div class="skeleton-line" style="width:60%"></div>
        <div class="skeleton-line" style="width:40%;height:10px;margin-top:8px"></div>
        <div class="skeleton-line" style="width:80%;height:10px;margin-top:10px"></div>
      </div>
    </div>`).join('');
}

function renderApps() {
  let apps = allApps;
  if (currentCat) apps = apps.filter(a => (a.app_categories || []).some(ac => ac.category_id === currentCat));
  if (!apps.length) { grid.innerHTML = '<div class="empty">В этом разделе пока пусто</div>'; return; }
  grid.innerHTML = apps.map(a => {
    const author = a.author_slug
      ? `<a href="profile.html?u=${encodeURIComponent(a.author_slug)}" onclick="event.stopPropagation()">${esc(a.author)}</a>`
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
          ${a.rating_count > 0 ? `<span class="review-stars" style="font-size:11px">${'★'.repeat(Math.round(a.rating_avg))}${'☆'.repeat(5 - Math.round(a.rating_avg))}</span> <span style="color:var(--muted);font-size:11px">${a.rating_avg.toFixed(1)}</span>` : ''}
          ${!a.download_url ? '<span class="soon">Скоро</span>' : ''}
        </div>
      </div>
    </a>`;
  }).join('');
}

// Один batch-запрос рейтингов вместо N RPC
async function loadRatingsBatch() {
  const ids = allApps.map(a => a.id).filter(Boolean);
  if (!ids.length) return;
  try {
    const rows = await withRetry(() => dbSelect(
      'reviews',
      'select=app_id,rating&status=eq.approved&app_id=in.(' + ids.join(',') + ')'
    ));
    const agg = {};
    (rows || []).forEach(r => {
      if (!agg[r.app_id]) agg[r.app_id] = { sum: 0, count: 0 };
      agg[r.app_id].sum += r.rating;
      agg[r.app_id].count += 1;
    });
    allApps.forEach(a => {
      const g = agg[a.id];
      a.rating_count = g ? g.count : 0;
      a.rating_avg = g ? g.sum / g.count : 0;
    });
  } catch {
    allApps.forEach(a => { if (a.rating_avg == null) { a.rating_avg = 0; a.rating_count = 0; } });
  }
}

async function loadAuthorSlugs() {
  const ids = [...new Set(allApps.map(a => a.author_profile_id).filter(Boolean))];
  if (!ids.length) return;
  try {
    const profiles = await withRetry(() => dbSelect(
      'profiles', 'select=id,slug&id=in.(' + ids.join(',') + ')'
    ));
    const map = {};
    (profiles || []).forEach(p => { map[p.id] = p.slug; });
    allApps.forEach(a => { if (a.author_profile_id && map[a.author_profile_id]) a.author_slug = map[a.author_profile_id]; });
  } catch {}
}

async function fetchApps() {
  return withRetry(() => dbSelect(
    'apps',
    'select=id,name,slug,author,author_profile_id,icon_url,size_bytes,version,downloads,created_at,download_url,app_categories(category_id)&status=eq.published&order=created_at.desc'
  ));
}

async function loadApps() {
  // 1. Мгновенно — кэш или скелетон
  const cached = readCache(CACHE_KEY);
  if (cached && cached.length) {
    allApps = cached;
    renderApps();
  } else {
    renderSkeleton();
  }

  // 2. В фоне — сеть, с таймаутом и ретраями
  try {
    const apps = await fetchApps();
    if (!apps || !apps.length) {
      if (!cached) grid.innerHTML = '<div class="empty">Пока пусто</div>';
      return;
    }
    allApps = apps;
    await loadAuthorSlugs();
    await loadRatingsBatch();
    // 3. Один финальный рендер с полными данными
    renderApps();
    writeCache(CACHE_KEY, allApps);
  } catch (e) {
    if (!cached) {
      grid.innerHTML = '<div class="empty">Не удалось загрузить. Проверьте интернет и обновите страницу.</div>';
    }
    // если кэш был — оставляем его на экране, это лучше пустоты
  }
}

async function loadCategories() {
  if (!filtersBox) return;
  const cachedCats = readCache(CATS_CACHE_KEY);
  if (cachedCats) renderCats(cachedCats);
  try {
    const cats = await withRetry(() => dbSelect('categories', 'select=*&order=sort_order'));
    renderCats(cats || []);
    writeCache(CATS_CACHE_KEY, cats || []);
  } catch {
    if (!cachedCats) renderCats([]);
  }
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
