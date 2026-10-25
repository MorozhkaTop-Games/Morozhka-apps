import { dbSelect } from './api.js';
const content = document.getElementById('content');
const appId = new URLSearchParams(location.search).get('id');
const appSlug = new URLSearchParams(location.search).get('slug');
const formatSize = b => !b ? '—' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function init() {
  if (!content) return;
  if (!appId && !appSlug) { content.innerHTML = '<div class="empty">Приложение не найдено</div>'; return; }
  content.innerHTML = '<div class="empty">Загрузка…</div>';
  try {
    const base = appId ? 'id=eq.' + encodeURIComponent(appId) : 'slug=eq.' + encodeURIComponent(appSlug);
    const rows = await dbSelect('apps', 'select=*&' + base + '&status=eq.published&limit=1');
    if (!rows || !rows.length) { content.innerHTML = '<div class="empty">Приложение не найдено</div>'; return; }
    const app = rows[0];
    document.title = app.name + ' — Morozhka Apps';
    const shots = (app.screenshots || []).filter(Boolean);
    const hasDownload = !!app.download_url;
    content.innerHTML = `
      <div class="app-detail">
        <div>
          <div class="app-top">
            <img class="app-icon" src="${esc(app.icon_url)}" alt="" loading="lazy" decoding="async">
            <div style="flex:1;min-width:0">
              <h1>${esc(app.name)}</h1>
              <div class="author-line">Автор: ${esc(app.author)}</div>
              <div class="pill-row">
                ${app.version ? `<span class="pill">v${esc(app.version)}</span>` : ''}
                <span class="pill">${esc(app.age_rating || '0+')}</span>
              </div>
            </div>
          </div>
          <div class="section"><div class="section-title">Описание</div><p>${esc(app.description)}</p></div>
          ${shots.length ? `<div class="section"><div class="section-title">Скриншоты</div><div class="screenshots">${shots.map(u => `<img src="${esc(u)}" alt="" loading="lazy" decoding="async">`).join('')}</div></div>` : ''}
          <div class="section"><div class="section-title">Установка</div><p>${esc(app.install_instructions || 'Скачайте APK и откройте файл.')}</p></div>
        </div>
        <div>
          <div class="download-box">
            ${hasDownload ? '<button class="download-btn" id="downloadBtn">Скачать</button>' : '<button class="download-btn download-btn-soon" disabled>Скоро</button>'}
            <div class="size">${formatSize(app.size_bytes)}</div>
            <div class="download-meta">
              <div><span>Версия</span><span>${esc(app.version || '—')}</span></div>
              <div><span>Скачиваний</span><span>${app.downloads}</span></div>
            </div>
          </div>
        </div>
      </div>`;
    const btn = document.getElementById('downloadBtn');
    if (btn) btn.addEventListener('click', () => { window.location.href = app.download_url; });
  } catch (e) {
    content.innerHTML = '<div class="empty">Ошибка: ' + esc(e.message) + '</div>';
  }
}
init();
