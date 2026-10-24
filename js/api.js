// было: withApiKey (?apikey=...), fetchWithRetry 10 попыток ~30 с
// стало: ключ ТОЛЬКО в заголовках, один fetch с AbortController, таймаут 15 с, без ретраев
const SUPABASE_URL = 'https://tksbqddskldnaafevmnl.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrc2JxZGRza2xkbmFhZmV2bW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzcxNjEsImV4cCI6MjEwODM1MzE2MX0.7wiyoe1Jdx6Xvq6oMc9vplLcuFRUuyB28CmqcOF7Vbc';

const HEADERS = {
  'apikey': KEY,
  'Authorization': 'Bearer ' + KEY,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

async function req(path, options = {}, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(SUPABASE_URL + path, {
      ...options,
      headers: { ...HEADERS, ...(options.headers || {}) },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

export async function dbSelect(table, query = '') {
  const path = '/rest/v1/' + table + (query ? '?' + query : '');
  const res = await req(path);
  if (!res.ok) {
    const t = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 200));
  }
  return await res.json();
}

export async function dbInsert(table, row) {
  const res = await req('/rest/v1/' + table, {
    method: 'POST',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 200));
  }
  return true;
}

export async function dbUpdate(table, filter, patch) {
  const res = await req('/rest/v1/' + table + '?' + filter, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 200));
  }
}

export async function dbRpc(fn, args = {}) {
  const res = await req('/rest/v1/rpc/' + fn, {
    method: 'POST',
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 200));
  }
  return await res.json();
}

export async function storageUpload(bucket, path, file) {
  const res = await req('/storage/v1/object/' + bucket + '/' + path, {
    method: 'POST',
    headers: { 'x-upsert': 'true' },
    body: file,
  }, 60000);
  if (!res.ok) {
    const t = await res.text();
    throw new Error('Upload HTTP ' + res.status + ': ' + t.slice(0, 200));
  }
  return await res.json();
}

export function storageUrl(bucket, path) {
  return SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + path;
}
