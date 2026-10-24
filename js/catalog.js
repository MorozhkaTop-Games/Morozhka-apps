import { supabase, formatSize, esc } from './config.js';

const grid = document.getElementById('apps');
const filtersBox = document.getElementById('filters');

if (!grid) {
  document.body.innerHTML = '<div style="color:red;padding:20px">ОШИБКА: #apps не найден</div>';
  throw new Error('no #apps');
}

grid.innerHTML = '<div class="empty">1. Скрипт запустился</div>';

// Таймаут-обёртка
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Таймаут: ' + label + ' (' + ms + ' мс)')), ms)
    )
  ]);
}

async function init() {
  try {
    grid.innerHTML = '<div class="empty">2. Загружаю категории…</div>';

    const catsResult = await withTimeout(
      supabase.from('categories').select('*').order('sort_order'),
      10000,
      'категории'
    );

    if (catsResult.error) {
      filtersBox.innerHTML = '<div style="color:red;padding:10px;font-size:12px">Ошибка категорий: ' + catsResult.error.message + '</div>';
    } else {
      const cats = catsResult.data || [];
      filtersBox.innerHTML = `
        <button class="filter-btn active" data-cat="">Все</button>
        ${cats.map(c => `<button class="filter-btn" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}
      `;
    }

    grid.innerHTML = '<div class="empty">3. Загружаю приложения…</div>';

    const appsResult = await withTimeout(
      supabase
        .from('apps')
        .select('id, name, slug, author, author_profile_id, icon_url, size_bytes, version, downloads, created_at, download_url')
        .eq('status', 'published')
        .order('created_at', { ascending: false }),
      10000,
      'приложения'
    );

    if (appsResult.error) {
      grid.innerHTML = '<div style="color:red;padding:20px;font-size:14px">Ошибка приложений: ' + appsResult.error.message + '</div>';
      return;
    }

    const apps = appsResult.data || [];

    if (!apps.length) {
      grid.innerHTML = '<div class="empty">4. Приложений 0</div>';
      return;
    }

    grid.innerHTML = '<div class="empty">4. Приложений: ' + apps.length + '</div>';

    grid.innerHTML = apps.map(app => `
      <a href="app.html?slug=${app.slug || app.id}" class="app-card">
        <img class="icon" src="${app.icon_url || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E'}" alt="" loading="lazy">
        <div class="body">
          <h3>${esc(app.name)}</h3>
          <div class="author">${esc(app.author)}</div>
          <div class="meta">
            ${app.version ? `<span>v${esc(app.version)}</span>` : ''}
            <span>${formatSize(app.size_bytes)}</span>
            <span>${app.downloads} ↓</span>
            ${!app.download_url ? `<span class="soon">Скоро</span>` : ''}
          </div>
        </div>
      </a>
    `).join('');
  } catch (e) {
    grid.innerHTML = '<div style="color:red;padding:20px;font-size:14px;font-weight:700">ОШИБКА: ' + e.message + '</div>';
    console.error(e);
  }
}

init();
