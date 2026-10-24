import { supabase, formatSize, esc } from './config.js?v=2';

const content = document.getElementById('content');
const params = new URLSearchParams(location.search);
const profileId = params.get('id');
const profileSlug = params.get('u');

if (!profileId && !profileSlug) {
  content.innerHTML = '<div class="empty">Профиль не найден</div>';
} else {
  init();
}

async function init() {
  let query = supabase.from('profiles').select('*');
  if (profileSlug) query = query.eq('slug', profileSlug);
  else query = query.eq('id', profileId);

  const { data: profile, error } = await query.maybeSingle();

  if (error || !profile) {
    content.innerHTML = '<div class="empty">Профиль не найден</div>';
    return;
  }

  document.title = profile.display_name + ' — Morozhka Apps';

  const { data: apps } = await supabase
    .from('apps').select('id, name, slug, icon_url, size_bytes, downloads, version')
    .eq('author_profile_id', profile.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

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
        ${profile.links ? `<div class="slug" style="margin-top:10px">${esc(profile.links)}</div>` : ''}
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
