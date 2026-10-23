import { supabase, formatSize, formatDate, esc } from './config.js';

const content = document.getElementById('content');
const appId = new URLSearchParams(location.search).get('id');

if (!appId) content.innerHTML = '<div class="empty">Приложение не найдено</div>';
else init();

async function init() {
  const { data: app, error } = await supabase
    .from('apps')
    .select(`
      *,
      app_categories ( category_id, categories ( name ) )
    `)
    .eq('id', appId)
    .eq('status', 'published')
    .single();

  if (error || !app) {
    content.innerHTML = '<div class="empty">Приложение не найдено</div>';
    return;
  }

  document.title = app.name + ' — Morozhka Apps';

  // ссылка на профиль автора, если он есть
  const authorHtml = app.author_profile_id
    ? `<a href="profile.html?id=${app.author_profile_id}">${esc(app.author)}</a>`
    : esc(app.author);

  // категории
  const cats = (app.app_categories || [])
    .map(ac => ac.categories?.name)
    .filter(Boolean);

  // скриншоты
  const screenshots = (app.screenshots || []).filter(Boolean);
  const screenshotsHtml = screenshots.length
    ? `<div class="screenshots">${screenshots.map(u => `<img src="${u}" alt="">`).join('')}</div>`
    : '<p style="color:var(--muted)">Скриншоты не добавлены</p>';

  content.innerHTML = `
    <div class="app-detail">
      <div>
        <div class="app-top">
          <img class="app-icon" src="${app.icon_url || ''}" alt="">
          <div style="flex:1;min-width:0">
            <h1>${esc(app.name)}</h1>
            <div class="author-line">Автор: ${authorHtml}</div>
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
          ${screenshotsHtml}
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

  await supabase.rpc('increment_downloads_limited', {
    app_id: appId,
    client_id: clientId,
  });

  window.location.href = app.download_url;
  });

  document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const { error } = await supabase.from('reviews').insert({
      app_id: appId,
      name: fd.get('name'),
      rating: parseInt(fd.get('rating')),
      text: fd.get('text'),
    });
    if (error) alert('Ошибка: ' + error.message);
    else { alert('Отзыв отправлен на модерацию'); e.target.reset(); }
  });

  loadReviews();
}

async function loadReviews() {
  const box = document.getElementById('reviews');
  const { data } = await supabase
    .from('reviews').select('*')
    .eq('app_id', appId).eq('status', 'approved')
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
