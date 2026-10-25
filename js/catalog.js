import { dbSelect, dbRpc } from './api.js';

const grid = document.getElementById('apps');
const filtersBox = document.getElementById('filters');
let currentCat = null;
let allApps = [];

const formatSize = b => !b ? '—' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function loadApps() {
  if (!grid) return;
  grid.innerHTML = '<div class="empty">Загрузка…</div>';

  try {
    const apps = await dbSelect(
      'apps',
      'select=id,name,slug,author,author_profile_id,icon_url,size_bytes,version,downloads,created_at,download_url,description,screenshots,install_instructions,has_ads,has_iap,age_rating,status,app_categories(category_id)&status=eq.published&order=created_at.desc'
    );
    if (!apps || !apps.length) { grid.innerHTML = '<div class="empty">Пока пусто</div>'; return; }
    allApps = apps;

    try {
      const ids = [...new Set(apps.map(a => a.author_profile_id).filter(Boolean))];
      if (ids.length) {
        const profiles = await dbSelect('profiles', 'select=id,slug&id=in.(' + ids.join(',') + ')');
        const map = {};
        (profiles || []).forEach(p => { map[p.id] = p.slug; });
        allApps.forEach(a => {
          if (a.author_profile_id && map[a.author_profile_id]) a.author_slug = map[a.author_profile_id];
        });
      }
    } catch {}

    renderApps();
    loadRatings();
  } catch (e) {
    grid.innerHTML = '<div class="empty">Ошибка: ' + esc(e.message) + '</div>';
  }
}

async function loadRatings() {
  await Promise.all(allApps.map(async (a) => {
    try {
      const r = await dbRpc('get_app_rating', { p_app_id: a.id });
      a.rating_avg = (r && r.avg) || 0;
      a.rating_count = (r && r.count) || 0;
    } catch {
      a.rating_avg = 0;
      a.rating_count = 0;
    }
  }));
  renderApps();
}

function renderApps() {
  if (!grid) return;
  let apps = allApps;
  if (currentCat) apps = apps.filter(a => (a.app_categories || []).some(ac => ac.category_id === currentCat));
  if (!apps.length) { grid.innerHTML = '<div class="empty">В этом разделе пока пусто</div>'; return; }
  grid.innerHTML = apps.map(a => {
    const author = a.author_slug
      ? `<a href="profile.html?u=${encodeURIComponent(a.author_slug)}">${esc(a.author)}</a>`
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

async function loadCategories() {
  if (!filtersBox) return;
  try {
    const cats = await dbSelect('categories', 'select=*&order=sort_order');
    renderCats(cats || []);
  } catch { renderCats([]); }
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
