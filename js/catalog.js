import { supabase, formatSize, esc } from './config.js';

const grid = document.getElementById('apps');
const buttons = document.querySelectorAll('.cat-btn');
let currentCat = 'apk';

async function loadApps(category) {
  grid.innerHTML = '<div class="empty">Загрузка…</div>';
  const { data, error } = await supabase
    .from('apps').select('*')
    .eq('category', category)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    grid.innerHTML = '<div class="empty">Ошибка загрузки</div>';
    console.error(error);
    return;
  }
  if (!data.length) {
    grid.innerHTML = '<div class="empty">Пока нет приложений в этом разделе</div>';
    return;
  }

  grid.innerHTML = data.map(app => `
    <a href="app.html?id=${app.id}" class="app-card">
      <img src="${app.icon_url || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E'}" alt="">
      <div class="info">
        <h3>${esc(app.name)}</h3>
        <div class="author">${esc(app.author)}</div>
        <div class="meta">
          <span>${formatSize(app.size_bytes)}</span>
          <span>${app.downloads} ↓</span>
        </div>
      </div>
    </a>
  `).join('');
}

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCat = btn.dataset.cat;
    loadApps(currentCat);
  });
});

loadApps(currentCat);
