import { supabase, formatSize, esc } from './config.js';
import { getSession, clearSession } from './session.js';

const content = document.getElementById('content');
const session = getSession();

if (!session) {
  content.innerHTML = `
    <div class="login-wrap" style="margin:100px auto;text-align:center">
      <h1>Нужен вход</h1>
      <p style="color:var(--muted);margin-bottom:20px;font-size:14px">
        Войдите или зарегистрируйтесь, чтобы управлять профилем.
      </p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <a href="login.html" class="btn" style="text-align:center">Войти</a>
        <a href="signup.html" class="btn btn-ghost" style="text-align:center">Регистрация</a>
      </div>
    </div>
  `;
} else {
  init();
}

async function init() {
  const { data: profile, error } = await supabase
    .from('profiles').select('*').eq('id', session.profile_id).single();

  if (error || !profile) {
    content.innerHTML = '<div class="empty">Профиль не найден</div>';
    return;
  }

  const { data: apps } = await supabase
    .from('apps').select('id, name, icon_url, size_bytes, downloads, version, status')
    .eq('author_profile_id', profile.id)
    .order('created_at', { ascending: false });

  content.innerHTML = `
    <div class="page-header">
      <h1>Мой профиль</h1>
      <p><a href="profile.html?id=${profile.id}" style="color:var(--accent)">Публичная страница</a> · <a href="#" id="logoutBtn" style="color:var(--danger)">Выйти</a></p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 320px;gap:40px">
      <div>
        <div class="section">
          <div class="section-title">Данные профиля</div>
          <form id="profileForm">
            <div class="form-row">
              <div class="form-group">
                <label>Имя / никнейм *</label>
                <input type="text" name="display_name" value="${esc(profile.display_name)}" required maxlength="60">
              </div>
              <div class="form-group">
                <label>Slug *</label>
                <input type="text" name="slug" value="${esc(profile.slug)}" required pattern="[a-z0-9-]{2,30}">
              </div>
            </div>
            <div class="form-group">
              <label>Аватар (URL)</label>
              <input type="url" name="avatar_url" value="${esc(profile.avatar_url || '')}">
            </div>
            <div class="form-group">
              <label>О себе</label>
              <textarea name="bio" maxlength="300">${esc(profile.bio || '')}</textarea>
            </div>
            <div class="form-group">
              <label>Ссылки (одна на строку)</label>
              <textarea name="links">${esc(profile.links || '')}</textarea>
            </div>
            <div class="form-group">
              <label>Пароль (для подтверждения) *</label>
              <input type="password" name="password" required>
              <div class="hint">Введите текущий пароль, чтобы сохранить изменения</div>
            </div>
            <button type="submit" class="btn">Сохранить</button>
            <p id="saveStatus" style="margin-top:10px;font-size:13px"></p>
          </form>
        </div>
      </div>

      <div>
        <div class="section-title">Мои приложения · ${apps?.length || 0}</div>
        ${(apps && apps.length) ? apps.map(a => `
          <div class="admin-item" style="margin-bottom:8px">
            <img src="${a.icon_url || ''}" alt="">
            <div class="grow">
              <h4>${esc(a.name)}</h4>
              <small>${formatSize(a.size_bytes)} · ${a.downloads} ↓ ${a.status === 'hidden' ? '· скрыто' : ''}</small>
            </div>
            ${a.status === 'published' ? `<a href="app.html?id=${a.id}" class="btn btn-ghost btn-sm" target="_blank">Открыть</a>` : ''}
          </div>
        `).join('') : '<div class="empty" style="padding:20px;font-size:13px">Приложений пока нет</div>'}

        <div style="margin-top:20px;padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);font-size:13px;color:var(--muted)">
          Чтобы добавить приложение, отправьте заявку через <a href="publish.html">страницу публикации</a>. Админ привяжет его к вашему профилю.
        </div>
      </div>
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    clearSession();
    location.href = 'index.html';
  });

  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const statusEl = document.getElementById('saveStatus');
    statusEl.textContent = 'Сохранение…';
    statusEl.style.color = 'var(--muted)';

    const { data, error } = await supabase.rpc('update_own_profile', {
      p_account_id: session.account_id,
      p_current_password: fd.get('password'),
      p_display_name: fd.get('display_name'),
      p_slug: fd.get('slug'),
      p_avatar_url: fd.get('avatar_url') || '',
      p_bio: fd.get('bio') || '',
      p_links: fd.get('links') || '',
    });

    if (error) {
      statusEl.textContent = 'Ошибка: ' + error.message;
      statusEl.style.color = 'var(--danger)';
      return;
    }
    if (data.error) {
      statusEl.textContent = data.error;
      statusEl.style.color = 'var(--danger)';
      return;
    }

    // обновляем сессию — если менялся slug/имя
    const newSession = {
      ...session,
      display_name: fd.get('display_name'),
      slug: fd.get('slug').toLowerCase(),
    };
    localStorage.setItem('morozhka_session', JSON.stringify(newSession));

    statusEl.textContent = 'Сохранено!';
    statusEl.style.color = 'var(--success)';
    e.target.password.value = '';
  });
}
