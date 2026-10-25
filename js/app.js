import { dbSelect, dbRpc } from './api.js';

const content = document.getElementById('content');
const appId = new URLSearchParams(location.search).get('id');
const appSlug = new URLSearchParams(location.search).get('slug');
const formatSize = b => !b ? '—' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function getClientId() {
  let id = localStorage.getItem('client_id');
  if (!id) { id = 'c_' + Math.random().toString(36).slice(2) + Date.now(); localStorage.setItem('client_id', id); }
  return id;
}

function readApp(slug) {
  try {
    const raw = localStorage.getItem('app_' + slug);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function starsHtml(avg, count) {
  if (!count) return '<span style="color:var(--muted-2);font-size:13px">Пока нет оценок</span>';
  const full = Math.round(avg);
  return `<span class="review-stars" style="font-size:16px">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span> <span style="color:var(--muted);font-size:13px">${avg.toFixed(1)} (${count} ${count === 1 ? 'отзыв' : count < 5 ? 'отзыва' : 'отзывов'})</span>`;
}

function renderApp(app) {
  document.title = app.name + ' — Morozhka Apps';
  const shots = (app.screenshots || []).filter(Boolean);
  const hasDownload = !!app.download_url;
  const author = app.author_profile && app.author_profile.slug
    ? `<a href="profile.html?u=${encodeURIComponent(app.author_profile.slug)}">${esc(app.author)}</a>`
    : esc(app.author);

  content.innerHTML = `
    <div class="app-detail">
      <div>
        <div class="app-top">
          <img class="app-icon" src="${esc(app.icon_url)}" alt="" width="88" height="88" decoding="async">
          <div style="flex:1;min-width:0">
            <h1>${esc(app.name)}</h1>
            <div class="author-line">Автор: ${author}</div>
            <div class="pill-row">
              ${app.version ? `<span class="pill">v${esc(app.version)}</span>` : ''}
              <span class="pill">${esc(app.age_rating || '0+')}</span>
            </div>
            <div id="ratingBox" style="margin-top:10px">${app.rating_count > 0 ? starsHtml(app.rating_avg || 0, app.rating_count) : '<span style="color:var(--muted-2);font-size:13px">Рейтинг загружается…</span>'}</div>
          </div>
        </div>

        <div class="section"><div class="section-title">Описание</div><p>${esc(app.description)}</p></div>

        ${shots.length ? `<div class="section"><div class="section-title">Скриншоты</div><div class="screenshots">${shots.map(u => `<img src="${esc(u)}" alt="" loading="lazy" decoding="async">`).join('')}</div></div>` : ''}

        <div class="section"><div class="section-title">Установка</div><p>${esc(app.install_instructions || 'Скачайте APK и откройте файл.')}</p></div>

        <div class="section">
          <div class="section-title">Отзывы</div>
          <button id="loadReviewsBtn" class="btn btn-ghost btn-sm">Показать отзывы</button>
          <div id="reviewsBox" style="margin-top:12px"></div>
          <form id="reviewForm" class="review-form">
            <div class="form-row">
              <div class="form-group"><label>Имя</label>
                <input type="text" name="name" required maxlength="40"></div>
              <div class="form-group"><label>Оценка (1–5)</label>
                <input type="number" name="rating" min="1" max="5" value="5" required></div>
            </div>
            <div class="form-group"><label>Отзыв</label>
              <textarea name="text" required maxlength="500" minlength="3"></textarea></div>
            <button type="submit" class="btn">Отправить отзыв</button>
            <p id="reviewStatus" style="margin-top:8px;font-size:13px"></p>
          </form>
        </div>
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

  dbRpc('get_app_rating', { p_app_id: app.id })
    .then(r => {
      const box = document.getElementById('ratingBox');
      if (!box) return;
      if (r && r.count > 0) {
        box.innerHTML = starsHtml(r.avg, r.count);
        app.rating_avg = r.avg; app.rating_count = r.count;
        try { localStorage.setItem('app_' + (app.slug || app.id), JSON.stringify(app)); } catch {}
      } else {
        box.innerHTML = '<span style="color:var(--muted-2);font-size:13px">Пока нет оценок</span>';
      }
    })
    .catch(() => {
      const box = document.getElementById('ratingBox');
      if (box) box.innerHTML = '';
    });

  document.getElementById('loadReviewsBtn').addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Загрузка…';
    const box = document.getElementById('reviewsBox');
    try {
      const reviews = await dbSelect('reviews', 'select=*&app_id=eq.' + app.id + '&status=eq.approved&order=created_at.desc&limit=50');
      if (!reviews.length) { box.innerHTML = '<div class="empty" style="padding:20px">Пока нет отзывов.</div>'; return; }
      box.innerHTML = reviews.map(r => `
        <div class="review">
          <div class="review-head">
            <div class="review-name">${esc(r.name)}</div>
            <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
          </div>
          <div class="review-text">${esc(r.text)}</div>
          <div class="review-date">${new Date(r.created_at).toLocaleDateString('ru-RU')}</div>
        </div>`).join('');
      e.target.style.display = 'none';
    } catch (err) {
      box.innerHTML = '<div class="empty" style="padding:20px;color:var(--danger)">Ошибка: ' + esc(err.message) + '</div>';
      e.target.disabled = false;
      e.target.textContent = 'Попробовать снова';
    }
  });

  document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const st = document.getElementById('reviewStatus');
    st.textContent = 'Отправка…'; st.style.color = 'var(--muted)';
    try {
      const res = await dbRpc('submit_review', {
        p_app_id: app.id, p_name: fd.get('name'),
        p_rating: parseInt(fd.get('rating'), 10),
        p_text: fd.get('text'), p_client_id: getClientId(),
      });
      if (res && res.error) { st.textContent = res.error; st.style.color = 'var(--danger)'; return; }
      st.textContent = '✅ Отзыв отправлен на модерацию'; st.style.color = 'var(--success)';
      e.target.reset();
    } catch (err) { st.textContent = 'Ошибка: ' + err.message; st.style.color = 'var(--danger)'; }
  });
}

function showNotFound() {
  content.innerHTML = `
    <div class="empty" style="padding:40px 20px">
      <p style="margin-bottom:16px">Приложение не найдено.</p>
      <a href="catalog.html" class="btn">Перейти в каталог</a>
    </div>`;
}

async function init() {
  if (!content) return;

  if (appSlug) {
    const app = readApp(appSlug);
    if (app) {
      renderApp(app);
      dbSelect('apps', 'select=id,name,slug,author,author_profile_id,icon_url,size_bytes,version,downloads,created_at,download_url,description,screenshots,install_instructions,has_ads,has_iap,age_rating,status,author_profile:profiles!author_profile_id(slug)&slug=eq.' + encodeURIComponent(appSlug) + '&status=eq.published&limit=1')
        .then(rows => {
          if (rows && rows.length) {
            const fresh = rows[0];
            try { localStorage.setItem('app_' + appSlug, JSON.stringify(fresh)); } catch {}
            renderApp(fresh);
          }
        })
        .catch(() => {});
      return;
    }
  }

  content.innerHTML = '<div class="empty">Загрузка…</div>';
  try {
    const base = appId ? 'id=eq.' + encodeURIComponent(appId) : 'slug=eq.' + encodeURIComponent(appSlug);
    const rows = await dbSelect('apps', 'select=*&' + base + '&status=eq.published&limit=1');
    if (!rows || !rows.length) { showNotFound(); return; }
    const app = rows[0];
    try { localStorage.setItem('app_' + (app.slug || app.id), JSON.stringify(app)); } catch {}
    renderApp(app);
  } catch (e) {
    content.innerHTML = `<div class="empty">Ошибка: ${esc(e.message)}<br><br><a href="catalog.html" class="btn">В каталог</a></div>`;
  }
}
init();
