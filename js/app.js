import { supabase, formatSize, formatDate, esc } from './config.js';

const content = document.getElementById('content');
const params = new URLSearchParams(location.search);
const appId = params.get('id');

if (!appId) {
  content.innerHTML = '<div class="empty">Приложение не найдено</div>';
} else {
  init();
}

async function init() {
  const { data: app, error } = await supabase
    .from('apps').select('*').eq('id', appId).eq('status', 'published').single();

  if (error || !app) {
    content.innerHTML = '<div class="empty">Приложение не найдено</div>';
    return;
  }

  document.title = app.name + ' — Morozhka Apps';

  content.innerHTML = `
    <div class="app-header">
      <img src="${app.icon_url || ''}" alt="">
      <div>
        <h1>${esc(app.name)}</h1>
        <div class="author">Автор: ${esc(app.author)}</div>
        <div class="tags">
          <span class="tag">${formatSize(app.size_bytes)}</span>
          <span class="tag">v${esc(app.version || '—')}</span>
          <span class="tag">${app.downloads} скачиваний</span>
          <span class="tag">${app.category === 'games' ? 'Игра' : 'APK'}</span>
        </div>
      </div>
    </div>

    <div class="app-body">
      <div>
        <div class="section">
          <div class="section-title">Описание</div>
          <p>${esc(app.description)}</p>
        </div>
        <div class="section">
          <div class="section-title">Установка</div>
          <p>${esc(app.install_instructions || 'Скачайте APK и откройте файл. Разрешите установку из неизвестных источников в настройках.')}</p>
        </div>
        <div class="section">
          <div class="section-title">Отзывы</div>
          <div id="reviews"><div class="empty" style="padding:20px 0">Загрузка…</div></div>
          <form class="review-form" id="reviewForm">
            <input type="text" name="name" placeholder="Ваше имя" required maxlength="60">
            <select name="rating" required>
              <option value="">Оценка</option>
              <option value="5">★★★★★ — 5</option>
              <option value="4">★★★★ — 4</option>
              <option value="3">★★★ — 3</option>
              <option value="2">★★ — 2</option>
              <option value="1">★ — 1</option>
            </select>
            <textarea name="text" placeholder="Текст отзыва" required maxlength="1000"></textarea>
            <button type="submit" class="btn">Отправить отзыв</button>
            <small style="color:var(--muted);font-size:12px">Отзыв появится после модерации</small>
          </form>
        </div>
      </div>
      <div>
        <a href="#" class="download-btn" id="downloadBtn">Скачать</a>
        <div style="margin-top:12px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);text-align:center">
          ${formatSize(app.size_bytes)}
        </div>
      </div>
    </div>
  `;

  document.getElementById('downloadBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await supabase.rpc('increment_downloads', { app_id: appId });
    window.location.href = app.download_url;
  });

  document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const { error: revErr } = await supabase.from('reviews').insert({
      app_id: appId,
      name: fd.get('name'),
      rating: parseInt(fd.get('rating')),
      text: fd.get('text'),
    });
    if (revErr) alert('Ошибка: ' + revErr.message);
    else { alert('Спасибо! Отзыв отправлен на модерацию.'); e.target.reset(); }
  });

  loadReviews();
}

async function loadReviews() {
  const box = document.getElementById('reviews');
  const { data } = await supabase
    .from('reviews').select('*').eq('app_id', appId).eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (!data || !data.length) {
    box.innerHTML = '<div class="empty" style="padding:20px 0">Пока нет отзывов</div>';
    return;
  }
  box.innerHTML = data.map(r => `
    <div class="review">
      <div class="review-head">
        <span class="review-name">${esc(r.name)}</span>
        <span class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
      </div>
      <div class="review-text">${esc(r.text)}</div>
      <div class="review-date" style="margin-top:8px">${formatDate(r.created_at)}</div>
    </div>
  `).join('');
}
