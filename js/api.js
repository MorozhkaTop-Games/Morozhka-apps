// Мини-клиент Supabase на прямом fetch. Без supabase-js.
const SUPABASE_URL = 'https://tksbqddskldnaafevmnl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrc2JxZGRza2xkbmFhZmV2bW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzcxNjEsImV4cCI6MjEwODM1MzE2MX0.7wiyoe1Jdx6Xvq6oMc9vplLcuFRUuyB28CmqcOF7Vbc';

const HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
};

// Таймаут 15 секунд на любой запрос
function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Таймаут ' + ms + ' мс — Supabase не ответил')), ms)
    )
  ]);
}

// SELECT: /rest/v1/{table}?{query}
export async function dbSelect(table, query = '') {
  const url = SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : '');
  const res = await withTimeout(fetch(url, { headers: HEADERS }));
  if (!res.ok) {
    const text = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + text.slice(0, 200));
  }
  return await res.json();
}

// INSERT: POST /rest/v1/{table}
export async function dbInsert(table, row) {
  const url = SUPABASE_URL + '/rest/v1/' + table;
  const res = await withTimeout(fetch(url, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'return=representation' },
    body: JSON.stringify(row),
  }));
  if (!res.ok) {
    const text = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + text.slice(0, 200));
  }
  return await res.json();
}

// UPDATE: PATCH /rest/v1/{table}?{filter}
export async function dbUpdate(table, filter, patch) {
  const url = SUPABASE_URL + '/rest/v1/' + table + '?' + filter;
  const res = await withTimeout(fetch(url, {
    method: 'PATCH',
    headers: { ...HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify(patch),
  }));
  if (!res.ok) {
    const text = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + text.slice(0, 200));
  }
}

// RPC: POST /rest/v1/rpc/{fn}
export async function dbRpc(fn, args = {}) {
  const url = SUPABASE_URL + '/rest/v1/rpc/' + fn;
  const res = await withTimeout(fetch(url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(args),
  }));
  if (!res.ok) {
    const text = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + text.slice(0, 200));
  }
  return await res.json();
}

// STORAGE: загрузка файла
export async function storageUpload(bucket, path, file) {
  const url = SUPABASE_URL + '/storage/v1/object/' + bucket + '/' + path;
  const res = await withTimeout(fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'x-upsert': 'true',
    },
    body: file,
  }), 60000);
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Upload HTTP ' + res.status + ': ' + text.slice(0, 200));
  }
  return await res.json();
}

export function storageUrl(bucket, path) {
  return SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + path;
}
