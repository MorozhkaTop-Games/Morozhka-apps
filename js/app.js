import { dbSelect, dbInsert, dbRpc } from './api.js';

const content = document.getElementById('content');
const params = new URLSearchParams(location.search);
const appId = params.get('id');
const appSlug = params.get('slug');

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU');
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function renderStars(avg) {
  const full = Math.floor(avg);
  const half = avg - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '☆' : '') + '☆'.repeat(empty);
}

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

if (!appId && !appSlug) {
  content.innerHTML = '<div class="empty">Приложение не найдено</div>';
} else {
  init();
}

async function init() {
  const cacheKey = 'cache_app_' + (appId || appSlug);

  // 1. Из кеша — мгновенно
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const app = JSON.parse(cached);
      renderApp(app);
    } catch (e) {}
  } else {
    content.innerHTML = '<div class="empty">Загрузка…</div>';
  }

  // 2. Из Supabase — обновляем в фоне
  try {
    const filter = appId ? 'id=eq.' + appId : 'slug=eq.' + appSlug;
    const rows = await dbSelect('apps', 'select=*&' + filter + '&limit=1');

    if (!rows || !rows.length) {
      if (!cached) content.innerHTML = '<div class="empty">Приложение не найдено в базе</div>';
      return;
    }

    const app = rows[0];

    if (app.status !== 'published') {
      content.innerHTML = '<div class="empty">Приложение скрыто</div>';
      return;
    }

    localStorage.setItem(cacheKey, JSON.stringify(app));
    renderApp(app);
  } catch (e) {
    if (!cached) {
      content.innerHTML = '<div class="empty">Не удалось загрузить. Обновите страницу.</div>';
    }
  }
}

async function renderApp(app) {
  let cats = [];
  let authorSlug = null;
  let authorName = app.author;
  let rating = { avg: 0, count: 0 };

  // Параллельно: категории, автор, рейтинг. Кешируем отдельно.
  const metaKey = 'cache_app_meta_' + app.id;
  const cachedMeta = localStorage.getItem(metaKey);
  if (cachedMeta) {
    try {
      const m = JSON.parse(cachedMeta);
      cats = m.cats || [];
      authorSlug = m.authorSlug || null;
      authorName = m.authorName || app.author;
      rating = m.rating || { avg: 0, count: 0 };
    } catch (e) {}
  }

  try {
    const [catLinks, profiles, ratingData] = await Promise.all([
      dbSelect('app_categories', 'select=category_id,categories(name)&app_id=eq.' + app.id).catch(() => []),
      app.author_profile_id
        ? dbSelect('profiles', 'select=slug,display_name&id=eq.' + app.author_profile_id + '&limit=1').catch(() => [])
        : Promise.resolve([]),
      dbRpc('get_app_rating', { p_app_id: app.id }).catch(() => ({ avg: 0, count: 0 })),
    ]);

    cats = (catLinks || []).map(ac => ac.categories?.name).filter(Boolean);
    if (profiles && profiles.length) {
      authorSlug = profiles[0].slug;
      authorName = profiles[0].display_name || app.author;
    }
    rating = ratingData || { avg: 0, count: 0 };

    localStorage.setItem(metaKey, JSON.stringify({ cats, authorSlug, authorName, rating }));
  } catch (e) {}

  document.title = app.name + ' — Morozhka Apps';

  const authorHtml = authorSlug
    ? `<a href="profile.html?u=${authorSlug}">${esc(authorName)}</a>`
    : esc(authorName);

  const screenshots = (app.screenshots || []).filter(Boolean);
  const hasDownload = !!app.download_url;

  content.innerHTML = `
    <div class="app-detail">
      <div>
        <div class="app-top">
          <img class="app-icon" src="${app.icon_url || ''}" alt="">
          <div style="flex:1;min-width:0">
            <h1>${esc(app.name)}</h1>
            <div class="author-line">Автор: ${authorHtml}</div>
            <div style="margin:8px 0 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="color:var(--warning);font-size:15px;letter-spacing:2px">${renderStars(rating.avg)}</span>
              <span style="color:var(--text);font-weight:600">${rating.avg > 0 ? rating.avg.toFixed(1) : '—'}</span>
              <span style="color:var(--muted);font-size:13px">(${rating.count} отзывов)</span>
            </div>
            <div class="pill-row">
              ${cats.map(c => `<span class="pill accent">${esc(c)}</span>`).join('')}
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
          <div class="section-title">Информация</div>
          <div class="info-grid">
            <div class="info-row"><span class="k">Реклама</span><span class="v ${app.has_ads ? 'yes' : 'no'}">${app.has_ads ? 'Есть' : 'Нет'}</span></div>
            <div class="info-row"><span class="k">Транзакции</span><span class="v ${app.has_iap ? 'yes' : 'no'}">${app.has_iap ? 'Есть' : 'Нет'}</span></div>
            <div class="info-row"><span class="k">Возраст</span><span class="v">${esc(app.age_rating || '0+')}</span></div>
            <div class="info-row"><span class="k">Версия</span><span class="v">${esc(app.version || '—')}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Установка</div>
          <p>${esc(app.install_instructions || 'Скачайте APK, откройте файл и разрешите установку из неизвестных источников.')}</p>
        </div>

        <div class="section">
          <div class="section-title">Отзывы</div>
          <div id="reviews"><div class="empty" style="padding:20px 0;border:none">Загрузка…</div></div>

          <form class="review-form" id="reviewForm">
            <div class="form-row">
              <div class="form-group">
                <label>Ваше имя</label>
                <input type="text" name="name" required maxlength="60">
              </div>
              <div class="form-group">
                <label>Оценка</label>
                <select name="rating" required>
                  <option value="">—</option>
                  <option value="5">★★★★★ 5</option>
                  <option value="4">★★★★ 4</option>
                  <option value="3">★★★ 3</option>
                  <option value="2">★★ 2</option>
                  <option value="1">★ 1</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Текст отзыва</label>
              <textarea name="text" required maxlength="1000"></textarea>
            </div>
            <button type="submit" class="btn">Отправить на модерацию</button>
          </form>
        </div>
      </div>

      <div>
        <div class="download-box">
          ${hasDownload
            ? `<button class="download-btn" id="downloadBtn">Скачать</button>`
            : `<button class="download-btn download-btn-soon" disabled>Скоро</button>
               <div style="text-align:center;color:var(--muted);font-size:12px;margin-top:8px">Приложение ещё не готово</div>`}
          <div class="size">${formatSize(app.size_bytes)}</div>
          <div class="download-meta">
            <div><span>Версия</span><span>${esc(app.version || '—')}</span></div>
            <div><span>Скачиваний</span><span>${app.downloads}</span></div>
            <div><span>Возраст</span><span>${esc(app.age_rating || '0+')}</span></div>
            <div><span>Рейтинг</span><span>${rating.avg > 0 ? rating.avg.toFixed(1) + ' ★' : '—'}</span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const downloadBtn = document.getElementById('downloadBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      try {
        let clientId = localStorage.getItem('morozhka_client_id');
        if (!clientId) {
          clientId = uuid();
          localStorage.setItem('morozhka_client_id', clientId);
        }
        await dbRpc('increment_downloads_limited', { app_id: app.id, client_id: clientId });
      } catch (e) {}
      window.location.href = app.download_url;
    });
  }

  document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await dbInsert('reviews', {
        app_id: app.id,
        name: fd.get('name'),
        rating: parseInt(fd.get('rating')),
        text: fd.get('text'),
      });
      alert('Отзыв отправлен на модерацию');
      e.target.reset();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  });

  loadReviews(app.id);
}

async function loadReviews(id) {
  const box = document.getElementById('reviews');
  if (!box) return;

  const cacheKey = 'cache_reviews_' + id;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      if (data && data.length) renderReviews(data);
    } catch (e) {}
  }

  try {
    const data = await dbSelect('reviews',
      'select=*&app_id=eq.' + id + '&status=eq.approved&order=created_at.desc');
    localStorage.setItem(cacheKey, JSON.stringify(data || []));
    renderReviews(data || []);
  } catch (e) {
    if (!cached) {
      const box2 = document.getElementById('reviews');
      if (box2) box2.innerHTML = '<div class="empty" style="padding:20px 0;border:none">Не удалось загрузить отзывы</div>';
    }
  }
}

function renderReviews(data) {
  const box = document.getElementById('reviews');
  if (!box) return;
  if (!data || !data.length) {
    box.innerHTML = '<div class="empty" style="padding:20px 0;border:none">Пока нет отзывов</div>';
    return;
  }
  box.innerHTML = data.map(r => `
    <div class="review">
      <div class="review-head">
        <span class="review-name">${esc(r.name)}</span>
        <span class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
      </div>
      <div class="review-text">${esc(r.text)}</div>
      <div class="review-date">${formatDate(r.created_at)}</div>
    </div>
  `).join('');
}
