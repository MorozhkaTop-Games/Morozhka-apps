import { dbRpc, storageUpload, storageUrl } from './api.js';
import { getSession, clearSession, saveSession } from './session.js';

const content = document.getElementById('content');
const session = getSession();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatSize = b => !b ? '—' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

if (!session) {
  content.innerHTML = `
    <div class="login-wrap" style="margin:80px auto;text-align:center">
      <h1>Нужен вход</h1>
      <div style="display:flex;flex-direction:column;gap:8px">
        <a href="login.html" class="btn" style="text-align:center">Войти</a>
        <a href="signup.html" class="btn btn-ghost" style="text-align:center">Регистрация</a>
      </div>
    </div>`;
} else init();

function renderProfileForm(p, apps) {
  const currentIcon = p.icon_url || '';
  content.innerHTML = `
    <div class="page-header">
      <h1>Мой профиль</h1>
      <p><a href="profile.html?u=${esc(p.slug)}">Публичная страница</a> · <a href="#" id="logoutBtn" style="color:var(--danger)">Выйти</a></p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 320px;gap:40px" class="account-grid">
      <div>
        <div class="section">
          <div class="section-title">Данные профиля</div>
          <form id="profileForm">
            <div class="form-row">
              <div class="form-group"><label>Имя / никнейм *</label>
                <input type="text" name="display_name" value="${esc(p.display_name)}" required maxlength="60"></div>
              <div class="form-group"><label>Slug *</label>
                <input type="text" name="slug" value="${esc(p.slug)}" required pattern="[a-z0-9-]{2,30}"></div>
            </div>
            <div class="form-group">
              <label>Иконка профиля</label>
              <div style="display:flex;gap:16px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
                <div id="iconPreview">
                  ${currentIcon
                    ? `<img src="${esc(currentIcon)}" width="80" height="80" style="border-radius:50%;object-fit:cover;border:2px solid var(--orange)">`
                    : `<div style="width:80px;height:80px;border-radius:50%;background:var(--surface-2);border:2px dashed var(--border-2);display:flex;align-items:center;justify-content:center;font-size:32px">🎃</div>`}
                </div>
                <div style="flex:1;min-width:200px">
                  <div class="file-input-wrap">
                    <span class="file-input-icon">⭐</span>
                    <div class="file-input-text"><strong>Нажмите или перетащите</strong><br>PNG, JPG, WebP до 2 МБ</div>
                    <input type="file" accept="image/*" id="iconInput">
                    <div class="file-input-name" id="iconName"></div>
                  </div>
                </div>
              </div>
              <div class="hint" id="iconHint">${currentIcon ? 'Иконка загружена' : 'Иконка не загружена'}</div>
            </div>
            <input type="hidden" id="iconUrlHidden" value="${esc(currentIcon)}">
            <div class="form-group"><label>О себе</label>
              <textarea name="bio" maxlength="300">${esc(p.bio || '')}</textarea></div>
            <div class="form-group" style="margin-bottom:32px"><label>Ссылки</label>
              <textarea name="links" rows="4">${esc(p.links || '')}</textarea></div>
            <button type="submit" class="btn">Сохранить изменения</button>
            <p id="saveStatus" style="margin-top:10px;font-size:13px"></p>
          </form>
        </div>
        <div class="section" style="margin-top:48px">
          <div class="section-title">Смена пароля</div>
          <form id="passwordForm">
            <div class="form-group"><label>Текущий пароль</label>
              <input type="password" name="current" required></div>
            <div class="form-row">
              <div class="form-group"><label>Новый пароль</label>
                <input type="password" name="new1" required minlength="8"></div>
              <div class="form-group"><label>Повторите новый</label>
                <input type="password" name="new2" required minlength="8"></div>
            </div>
            <button type="submit" class="btn">Сменить пароль</button>
            <p id="passStatus" style="margin-top:10px;font-size:13px"></p>
          </form>
        </div>
      </div>
      <div>
        <div class="section-title">Мои приложения · ${(apps || []).length}</div>
        ${(apps && apps.length) ? apps.map(a => `
          <div class="admin-item" style="margin-bottom:8px">
            <img src="${esc(a.icon_url || '')}" alt="" width="42" height="42" loading="lazy">
            <div class="grow"><h4>${esc(a.name)}</h4>
              <small>${formatSize(a.size_bytes)} · ${a.downloads} ↓</small>
            </div>
          </div>`).join('') : '<div class="empty" style="padding:20px;font-size:13px">Приложений пока нет</div>'}
      </div>
    </div>`;
  bind();
}

function bind() {
  document.getElementById('logoutBtn').addEventListener('click', e => {
    e.preventDefault();
    clearSession();
    location.href = 'index.html';
  });

  const iconInput = document.getElementById('iconInput');
  const iconHint = document.getElementById('iconHint');
  const iconPreview = document.getElementById('iconPreview');
  const iconUrlHidden = document.getElementById('iconUrlHidden');
  const iconName = document.getElementById('iconName');

  iconInput?.addEventListener('change', async () => {
    const file = iconInput.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { iconHint.textContent = 'Файл больше 2 МБ'; iconHint.style.color = 'var(--danger)'; return; }
    if (!file.type.startsWith('image/')) { iconHint.textContent = 'Только изображения'; iconHint.style.color = 'var(--danger)'; return; }
    iconName.textContent = file.name;
    iconHint.textContent = 'Загрузка…'; iconHint.style.color = 'var(--muted)';
    const ext = file.name.split('.').pop();
    const path = `user-${session.account_id}/icon-${Date.now()}.${ext}`;
    try {
      await storageUpload('icons', path, file);
      const url = storageUrl('icons', path);
      iconUrlHidden.value = url;
      iconHint.textContent = '✅ Загружено'; iconHint.style.color = 'var(--success)';
      iconPreview.innerHTML = `<img src="${url}" width="80" height="80" style="border-radius:50%;object-fit:cover;border:2px solid var(--orange)">`;
    } catch (err) { iconHint.textContent = 'Ошибка: ' + err.message; iconHint.style.color = 'var(--danger)'; }
  });

  document.getElementById('profileForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const s = document.getElementById('saveStatus');
    s.textContent = 'Сохранение…'; s.style.color = 'var(--muted)';
    try {
      const r = await dbRpc('update_own_profile', {
        p_account_id: session.account_id,
        p_display_name: fd.get('display_name'),
        p_slug: (fd.get('slug') || '').toLowerCase(),
        p_icon_url: iconUrlHidden.value || '',
        p_bio: fd.get('bio') || '',
        p_links: fd.get('links') || '',
      });
      if (r && r.error) { s.textContent = r.error; s.style.color = 'var(--danger)'; return; }
      saveSession({ ...session, display_name: fd.get('display_name'), slug: (fd.get('slug') || '').toLowerCase() });
      s.textContent = 'Сохранено!'; s.style.color = 'var(--success)';
    } catch (err) { s.textContent = 'Ошибка: ' + err.message; s.style.color = 'var(--danger)'; }
  });

  document.getElementById('passwordForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const s = document.getElementById('passStatus');
    if (fd.get('new1') !== fd.get('new2')) { s.textContent = 'Пароли не совпадают'; s.style.color = 'var(--danger)'; return; }
    s.textContent = 'Смена…'; s.style.color = 'var(--muted)';
    try {
      const r = await dbRpc('change_password', {
        p_account_id: session.account_id,
        p_current_password: fd.get('current'),
        p_new_password: fd.get('new1'),
      });
      if (r && r.error) { s.textContent = r.error; s.style.color = 'var(--danger)'; return; }
      s.textContent = 'Пароль изменён!'; s.style.color = 'var(--success)';
      e.target.reset();
    } catch (err) { s.textContent = 'Ошибка: ' + err.message; s.style.color = 'var(--danger)'; }
  });
}

function getCachedProfile() {
  try {
    const raw = localStorage.getItem('cache_profile');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function getCachedApps() {
  try {
    const raw = localStorage.getItem('cache_my_apps');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function init() {
  // Мгновенно из кэша или из session
  const cached = getCachedProfile();
  if (cached) {
    renderProfileForm(cached, getCachedApps());
    return;
  }

  // Если кэша нет — показываем форму из данных session (то, что уже знаем)
  renderProfileForm({
    display_name: session.display_name || 'Пользователь',
    slug: session.slug || '',
    icon_url: '',
    bio: '',
    links: '',
  }, []);

  // Кэш обновится после следующего сохранения или входа
}
