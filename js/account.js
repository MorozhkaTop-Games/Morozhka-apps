import { supabase, formatSize, esc } from './config.js';
import { getSession, clearSession } from './session.js';

const content = document.getElementById('content');
const session = getSession();

if (!session) {
  content.innerHTML = `
    <div class="login-wrap" style="margin:80px auto;text-align:center">
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
    .from('profiles').select('*').eq('id', session.profile_id).maybeSingle();

  if (error || !profile) {
    content.innerHTML = '<div class="empty">Профиль не найден</div>';
    return;
  }

  const { data: apps } = await supabase
    .from('apps').select('id, name, slug, icon_url, size_bytes, downloads, version, status')
    .eq('author_profile_id', profile.id)
    .order('created_at', { ascending: false });

  content.innerHTML = `
    <div class="page-header">
      <h1>Мой профиль</h1>
      <p><a href="profile.html?u=${esc(profile.slug)}">Публичная страница</a> · <a href="#" id="logoutBtn" style="color:var(--danger)">Выйти</a></p>
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

            <!-- АВАТАР -->
            <div class="form-group">
              <label>Аватар профиля</label>
              <div class="file-input-wrap" id="avatarWrap">
                <span class="file-input-icon">🎃</span>
                <div class="file-input-text">
                  <strong>Нажмите или перетащите</strong><br>
                  PNG, JPG, WebP до 2 МБ
                </div>
                <input type="file" accept="image/*" id="avatarInput">
                <div class="file-input-name" id="avatarName"></div>
              </div>
              <div class="hint" id="avatarHint">${profile.avatar_url ? 'Аватар загружен' : 'Аватар не загружен'}</div>
              <div id="avatarPreview" style="margin-top:12px">
                ${profile.avatar_url ? `<img src="${esc(profile.avatar_url)}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--accent)">` : ''}
              </div>
            </div>
            <input type="hidden" id="avatarUrlHidden" value="${esc(profile.avatar_url || '')}">

            <!-- ИКОНКА -->
            <div class="form-group">
              <label>Иконка профиля (для карточек)</label>
              <div class="file-input-wrap" id="iconWrap">
                <span class="file-input-icon">⭐</span>
                <div class="file-input-text">
                  <strong>Нажмите или перетащите</strong><br>
                  PNG 64×64, до 1 МБ
                </div>
                <input type="file" accept="image/*" id="iconInput">
                <div class="file-input-name" id="iconName"></div>
              </div>
              <div class="hint" id="iconHint">${profile.icon_url ? 'Иконка загружена' : 'Иконка не загружена'}</div>
              <div id="iconPreview" style="margin-top:12px">
                ${profile.icon_url ? `<img src="${esc(profile.icon_url)}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;border:2px solid var(--accent)">` : ''}
              </div>
            </div>
            <input type="hidden" id="iconUrlHidden" value="${esc(profile.icon_url || '')}">

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
              <div class="hint">Введите текущий пароль, чтобы сохранить</div>
            </div>

            <button type="submit" class="btn">Сохранить</button>
            <p id="saveStatus" style="margin-top:10px;font-size:13px"></p>
          </form>
        </div>

        <div class="section" style="margin-top:32px">
          <div class="section-title">Смена пароля</div>
          <form id="passwordForm">
            <div class="form-group">
              <label>Текущий пароль</label>
              <input type="password" name="current" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Новый пароль</label>
                <input type="password" name="new1" required minlength="8">
              </div>
              <div class="form-group">
                <label>Повторите новый</label>
                <input type="password" name="new2" required minlength="8">
              </div>
            </div>
            <button type="submit" class="btn">Сменить пароль</button>
            <p id="passStatus" style="margin-top:10px;font-size:13px"></p>
          </form>
        </div>
      </div>

      <div>
        <div class="section-title">Мои приложения · ${apps?.length || 0}</div>
        ${(apps && apps.length) ? apps.map(a => `
          <div class="admin-item" style="margin-bottom:8px">
            <img src="${esc(a.icon_url || '')}" alt="">
            <div class="grow">
              <h4>${esc(a.name)}</h4>
              <small>${formatSize(a.size_bytes)} · ${a.downloads} ↓ ${a.status === 'hidden' ? '· скрыто' : ''}</small>
            </div>
            ${a.status === 'published' ? `<a href="app.html?slug=${esc(a.slug || a.id)}" class="btn btn-ghost btn-sm" target="_blank">Открыть</a>` : ''}
          </div>
        `).join('') : '<div class="empty" style="padding:20px;font-size:13px">Приложений пока нет</div>'}

        <div style="margin-top:20px;padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);font-size:13px;color:var(--muted)">
          Чтобы добавить приложение, отправьте заявку через <a href="publish.html">страницу публикации</a>.
        </div>
      </div>
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    clearSession();
    location.href = 'index.html';
  });

  // ===== ЗАГРУЗКА АВАТАРА =====
  const avatarInput = document.getElementById('avatarInput');
  const avatarName = document.getElementById('avatarName');
  const avatarHint = document.getElementById('avatarHint');
  const avatarPreview = document.getElementById('avatarPreview');
  const avatarUrlHidden = document.getElementById('avatarUrlHidden');

  avatarInput?.addEventListener('change', async () => {
    const file = avatarInput.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      avatarHint.textContent = 'Файл больше 2 МБ';
      avatarHint.style.color = 'var(--danger)';
      return;
    }
    if (!file.type.startsWith('image/')) {
      avatarHint.textContent = 'Только изображения';
      avatarHint.style.color = 'var(--danger)';
      return;
    }

    avatarName.textContent = file.name;
    avatarHint.textContent = 'Загрузка…';
    avatarHint.style.color = 'var(--muted)';

    const ext = file.name.split('.').pop();
    const path = `user-${session.account_id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (error) {
      avatarHint.textContent = 'Ошибка: ' + error.message;
      avatarHint.style.color = 'var(--danger)';
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = data.publicUrl;

    avatarUrlHidden.value = publicUrl;
    avatarHint.textContent = '✅ Загружено';
    avatarHint.style.color = 'var(--success)';
    avatarPreview.innerHTML = `<img src="${publicUrl}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--accent)">`;
  });

  // ===== ЗАГРУЗКА ИКОНКИ =====
  const iconInput = document.getElementById('iconInput');
  const iconName = document.getElementById('iconName');
  const iconHint = document.getElementById('iconHint');
  const iconPreview = document.getElementById('iconPreview');
  const iconUrlHidden = document.getElementById('iconUrlHidden');

  iconInput?.addEventListener('change', async () => {
    const file = iconInput.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      iconHint.textContent = 'Файл больше 1 МБ';
      iconHint.style.color = 'var(--danger)';
      return;
    }

    iconName.textContent = file.name;
    iconHint.textContent = 'Загрузка…';
    iconHint.style.color = 'var(--muted)';

    const ext = file.name.split('.').pop();
    const path = `user-${session.account_id}/icon-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('icons')
      .upload(path, file, { upsert: true });

    if (error) {
      iconHint.textContent = 'Ошибка: ' + error.message;
      iconHint.style.color = 'var(--danger)';
      return;
    }

    const { data } = supabase.storage.from('icons').getPublicUrl(path);
    const publicUrl = data.publicUrl;

    iconUrlHidden.value = publicUrl;
    iconHint.textContent = '✅ Загружено';
    iconHint.style.color = 'var(--success)';
    iconPreview.innerHTML = `<img src="${publicUrl}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;border:2px solid var(--accent)">`;
  });

  // ===== СОХРАНЕНИЕ ПРОФИЛЯ =====
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
      p_avatar_url: avatarUrlHidden.value || '',
      p_bio: fd.get('bio') || '',
      p_links: fd.get('links') || '',
      p_icon_url: iconUrlHidden.value || '',
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

  // ===== СМЕНА ПАРОЛЯ =====
  document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const statusEl = document.getElementById('passStatus');

    if (fd.get('new1') !== fd.get('new2')) {
      statusEl.textContent = 'Новые пароли не совпадают';
      statusEl.style.color = 'var(--danger)';
      return;
    }

    statusEl.textContent = 'Смена…';
    statusEl.style.color = 'var(--muted)';

    const { data, error } = await supabase.rpc('change_password', {
      p_account_id: session.account_id,
      p_current_password: fd.get('current'),
      p_new_password: fd.get('new1'),
    });

    if (error || data.error) {
      statusEl.textContent = 'Ошибка: ' + (error?.message || data.error);
      statusEl.style.color = 'var(--danger)';
      return;
    }

    statusEl.textContent = 'Пароль изменён!';
    statusEl.style.color = 'var(--success)';
    e.target.reset();
  });
}
