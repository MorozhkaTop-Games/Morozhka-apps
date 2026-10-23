const KEY = 'morozhka_session';

export function saveSession(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function isLoggedIn() {
  return !!getSession();
}
