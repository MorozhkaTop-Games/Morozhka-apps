const KEY = 'morozhka_session';

export function saveSession(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}
export function getSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.account_id || !s.profile_id) return null;
    return s;
  } catch { return null; }
}
export function clearSession() {
  try { localStorage.removeItem(KEY); } catch {}
}
export function isLoggedIn() { return !!getSession(); }
