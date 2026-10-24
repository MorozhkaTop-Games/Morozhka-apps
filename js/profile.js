import { dbSelect } from './api.js';

const content = document.getElementById('content');
const params = new URLSearchParams(location.search);
const profileId = params.get('id');
const profileSlug = params.get('u');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

if (!profileId && !profileSlug) {
  content.innerHTML = '<div class="empty">Профиль не найден</div>';
} else {
  init();
}

async function init() {
  const cacheKey = 'cache_profile_' + (profileId || profileSlug);
  const cached = localStorage.getItem(cacheKey);

  // 1. Мгновенно из кеша
  if (cached) {
    try { render(JSON.parse(cached)); } catch (e) {}
  } else {
    content.innerHTML = '<div class="empty">Загрузка…</div>';
  }

  // 2. Обновляем из базы (если не успеет за 5 сек, останется кеш)
  try {
    const filter = profileSlug ? 'slug=eq.' + profileSlug : 'id=eq.' + profileId;
    const rows = await dbSelect('profiles', 'select=*&' + filter + '&limit=1');
    if (!rows || !rows.length) return;

    const profile = rows[0];
    const apps = await dbSelect('apps', 'select=id,name,slug,icon_url,size_bytes,downloads,version&author_profile_id=eq.' + profile.id + '&status=eq.published&order=created_at.desc');
    
    const data = { profile, apps };
    localStorage.setItem(cacheKey, JSON.stringify(data));
    render(data);
  } catch (e) {
    if (!cached) content.innerHTML = '<div class="empty">Не удалось загрузить</div>';
  }
}

function render(data) {
  const { profile, apps } = data;
  document.title = profile.display_name + ' — Morozhka Apps';

  const iconHtml = profile.icon_url
    ? `<img src="${esc(profile.icon_url)}" alt="">`
    : `<div style="width:96px;height:96px;border-radius:50%;background:var(--surface-2);border:2px dashed var(--border-2);display:flex;align-items:center;justify-content:center;font-size:40px;flex-shrink:0">🎃</div>`;

  content.innerHTML = `
    <div class="profile-header">
      ${iconHtml}
      <div>
        <h1>${esc(profile.display_name)}</h1>
        <div class="slug">@${esc(profile.slug)}</div>
        ${profile.bio ? `<div class="bio">${esc(profile.bio)}</div>` : ''}
      </div>
    </div>
    <div class="section-title">Приложения автора · ${apps?.length || 0}</div>
    <div class="apps-grid">
      ${(apps && apps.length) ? apps.map(a => `
        <a href="app.html?slug=${a.slug || a.id}" class="app-card">
          <img class="icon" src="${a.icon_url || ''}" alt="" loading="lazy">
          <div class="body">
            <h3>${esc(a.name)}</h3>
            <div class="meta">
              ${a.version ? `<span>v${esc(a.version)}</span>` : ''}
              <span>${formatSize(a.size_bytes)}</span>
              <span>${a.downloads} ↓</span>
            </div>
          </div>
        </a>
      `).join('') : '<div class="empty">Пока нет приложений</div>'}
    </div>
  `;
}
