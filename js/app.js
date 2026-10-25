import { dbSelect } from './api.js';

const content = document.getElementById('content');
const params = new URLSearchParams(location.search);
const appId = params.get('id');
const appSlug = params.get('slug');

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

if (!appId && !appSlug) {
  content.innerHTML = '<div class="empty">Приложение не найдено</div>';
} else {
  init();
}

async function init() {
  content.innerHTML = '<div class="empty">Загрузка…</div>';

  try {
    const filter = appId ? 'id=eq.' + appId : 'slug=eq.' + appSlug;
    const rows = await dbSelect('apps', 'select=*&' + filter + '&limit=1');
    
    if (!rows || !rows.length) {
      content.innerHTML = '<div class="empty">Приложение не найдено</div>';
      return;
    }
    
    const app = rows[0];

    document.title = app.name + ' — Morozhka Apps';

    const screenshots = (app.screenshots || []).filter(Boolean);
    const hasDownload = !!app.download_url;

    content.innerHTML = `
      <div class="app-detail">
        <div>
          <div class="app-top">
            <img class="app-icon" src="${app.icon_url || ''}" alt="">
            <div style="flex:1;min-width:0">
              <h1>${esc(app.name)}</h1>
              <div class="author-line">Автор: ${esc(app.author)}</div>
              <div class="pill-row">
                ${app.version ? `<span class="pill">v${esc(app.version)}</span>` : ''}
                <span class="pill">${esc(app.age_rating || '0+')}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Описание</div>
            <p>${esc(app.description)}</p>
          </div>

          ${screenshots.length ? `
          <div class="section">
            <div class="section-title">Скриншоты</div>
            <div class="screenshots">${screenshots.map(u => `<img src="${u}" alt="" loading="lazy">`).join('')}</div>
          </div>` : ''}

          <div class="section">
            <div class="section-title">Установка</div>
            <p>${esc(app.install_instructions || 'Скачайте APK и откройте файл.')}</p>
          </div>
        </div>

        <div>
          <div class="download-box">
            ${hasDownload
              ? `<button class="download-btn" id="downloadBtn">Скачать</button>`
              : `<button class="download-btn download-btn-soon" disabled>Скоро</button>`}
            <div class="size">${formatSize(app.size_bytes)}</div>
            <div class="download-meta">
              <div><span>Версия</span><span>${esc(app.version || '—')}</span></div>
              <div><span>Скачиваний</span><span>${app.downloads}</span></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        window.location.href = app.download_url;
      });
    }
  } catch (e) {
    content.innerHTML = '<div class="empty">Ошибка: ' + esc(e.message) + '</div>';
  }
}
