import { supabase, formatSize, formatDate, esc } from './config.js';

const content = document.getElementById('content');
const params = new URLSearchParams(location.search);
const appId = params.get('id');
const appSlug = params.get('slug');

if (!appId && !appSlug) {
  content.innerHTML = '<div class="empty">Приложение не найдено</div>';
} else {
  init();
}

async function init() {
  let query = supabase.from('apps').select('*');

  if (appId) {
    query = query.eq('id', appId);
  } else {
    query = query.eq('slug', appSlug);
  }

  const { data: app, error } = await query.maybeSingle();

  if (error) {
    content.innerHTML = '<div class="empty">Ошибка: ' + error.message + '</div>';
    return;
  }

  if (!app) {
    content.innerHTML = '<div class="empty">Приложение не найдено в базе</div>';
    return;
  }

  if (app.status !== 'published') {
    content.innerHTML = '<div class="empty">Приложение скрыто (status: ' + app.status + ')</div>';
    return;
  }

  // Категории
  const { data: catLinks } = await supabase
    .from('app_categories')
    .select('category_id, categories ( name )')
    .eq('app_id', app.id);

  const cats = (catLinks || [])
    .map(ac => ac.categories?.name)
    .filter(Boolean);

  // Автор
  let authorSlug = null;
  let authorName = app.author;

  if (app.author_profile_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('slug, display_name')
      .eq('id', app.author_profile_id)
      .maybeSingle();

    if (profile) {
      authorSlug = profile.slug;
      authorName = profile.display_name || app.author;
    }
  }

  // Рейтинг
  const { data: ratingData } = await supabase.rpc('get_app_rating', { p_app_id: app.id });
  const rating = ratingData || { avg: 0, count: 0 };

  document.title = app.name + ' — Morozhka Apps';

  const authorHtml = authorSlug
    ? `<a href="profile.html?u=${authorSlug}">${esc(authorName)}</a>`
    : esc(authorName);

  const screenshots = (app.screenshots || []).filter(Boolean);

  // Звёзды
  const stars = renderStars(rating.avg);

  content.innerHTML = `
    <div class="app-detail">
      <div>
        <div class="app-top">
          <img class="app-icon" src="${app.icon_url || ''}" alt="">
          <div style="flex:1;min-width:0">
            <h1>${esc(app.name)}</h1>
            <div class="author-line">Автор: ${authorHtml}</div>
            <div style="margin:8px 0 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="color:var(--warning);font-size:15px;letter-spacing:2px">${stars}</span>
              <span style="color:var(--text);font-weight:600">${rating.avg > 0 ? rating.avg.toFixed(1) : '—'}</span>
              <span style="color:var(--muted);font-size:13px">(${rating.count} ${plural(rating.count, 'отзыв', 'отзыва', 'отзывов')})</span>
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
          <p>${esc(app.install_instructions || 'Скачайте APK, откройте файл и разрешите установку из неизвестных источников в настройках Android.')}</p>
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
          <button class="download-btn" id="downloadBtn">Скачать</button>
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

  document.getElementById('downloadBtn').addEventListener('click', async () => {
    let clientId = localStorage.getItem('morozhka_client_id');
    if (!clientId) {
      clientId = crypto.randomUUID();
      localStorage.setItem('morozhka_client_id', clientId);
    }

    try {
      await supabase.rpc('increment_downloads_limited', {
        app_id: app.id,
        client_id: clientId,
      });
    } catch (e) {}

    window.location.href = app.download_url;
  });

  document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const { error } = await supabase.from('reviews').insert({
      app_id: app.id,
      name: fd.get('name'),
      rating: parseInt(fd.get('rating')),
      text: fd.get('text'),
    });
    if (error) alert('Ошибка: ' + error.message);
    else { alert('Отзыв отправлен на модерацию'); e.target.reset(); }
  });

  loadReviews(app.id);
}

async function loadReviews(id) {
  const box = document.getElementById('reviews');
  const { data } = await supabase
    .from('reviews').select('*')
    .eq('app_id', id).eq('status', 'approved')
    .order('created_at', { ascending: false });

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

// ===== УТИЛИТЫ =====
function renderStars(avg) {
  const full = Math.floor(avg);
  const half = avg - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '☆' : '') + '☆'.repeat(empty);
}

function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
