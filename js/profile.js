import { supabase, formatSize, esc } from './config.js';

const content = document.getElementById('content');
const id = new URLSearchParams(location.search).get('id');

if (!id) content.innerHTML = '<div class="empty">Профиль не найден</div>';
else init();

async function init() {
  const { data: profile, error } = await supabase
    .from('profiles').select('*').eq('id', id).single();

  if (error || !profile) {
    content.innerHTML = '<div class="empty">Профиль не найден</div>';
    return;
  }

  document.title = profile.display_name + ' — Morozhka Apps';

  const { data: apps } = await supabase
    .from('apps').select('id, name, icon_url, size_bytes, downloads, version')
    .eq('author_profile_id', id)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  content.innerHTML = `
    <div class="profile-header">
      <img src="${profile.avatar_url || ''}" alt="">
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
        <a href="app.html?id=${a.id}" class="app-card">
          <img class="icon" src="${a.icon_url || ''}" alt="">
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
