import { dbSelect } from './api.js';

const content = document.getElementById('content');
const profileId = new URLSearchParams(location.search).get('id');
const profileSlug = new URLSearchParams(location.search).get('u');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
const formatSize = b => {
  if (!b) return '—';
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
};

async function init() {
  if (!content) return;
  if (!profileId && !profileSlug) { content.innerHTML = '<div class="empty">Профиль не найден</div>'; return; }

  try {
    const filter = profileSlug
      ? 'slug=eq.' + encodeURIComponent(profileSlug)
      : 'id=eq.' + encodeURIComponent(profileId);
    const rows = await dbSelect('profiles', 'select=*&' + filter + '&limit=1');
    if (!rows || !rows.length) { content.innerHTML = '<div class="empty">Профиль не найден</div>'; return; }

    const p = rows[0];
    document.title = p.display_name + ' — Morozhka Apps';

    const apps = await dbSelect(
      'apps',
      'select=id,name,slug,icon_url,size_bytes,downloads,version&author_profile_id=eq.' + p.id + '&status=eq.published&order=created_at.desc'
    );

    const iconHtml = p.icon_url
      ? `<img src="${esc(p.icon_url)}" alt="" loading="lazy" decoding="async" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E'">`
      : `<div style="width:96px;height:96px;border-radius:50%;background:var(--surface-2);border:2px dashed var(--border-2);display:flex;align-items:center;justify-content:center;font-size:40px;flex-shrink:0">🎃</div>`;

    content.innerHTML = `
      <div class="profile-header">
        ${iconHtml}
        <div>
          <h1>${esc(p.display_name)}</h1>
          <div class="slug">@${esc(p.slug)}</div>
          ${p.bio ? `<div class="bio">${esc(p.bio)}</div>` : ''}
          ${p.links ? `<div class="slug" style="margin-top:10px">${esc(p.links)}</div>` : ''}
        </div>
      </div>
      <div class="section-title">Приложения автора · ${(apps || []).length}</div>
      <div class="apps-grid">
        ${(apps && apps.length) ? apps.map(a => `
          <a href="app.html?slug=${encodeURIComponent(a.slug || a.id)}" class="app-card">
            <img class="icon" src="${esc(a.icon_url || '')}" alt="" loading="lazy" decoding="async">
            <div class="body">
              <h3>${esc(a.name)}</h3>
              <div class="meta">
                ${a.version ? `<span>v${esc(a.version)}</span>` : ''}
                <span>${formatSize(a.size_bytes)}</span>
                <span>${a.downloads} ↓</span>
              </div>
            </div>
          </a>`).join('') : '<div class="empty">Пока нет приложений</div>'}
      </div>`;
  } catch (e) {
    content.innerHTML = '<div class="empty">Не удалось загрузить профиль</div>';
  }
}

init();
