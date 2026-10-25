const SUPABASE_URL = 'https://tksbqddskldnaafevmnl.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrc2JxZGRza2xkbmFhZmV2bW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzcxNjEsImV4cCI6MjEwODM1MzY2MX0.7wiyoe1Jdx6Xvq6oMc9vplLcuFRUuyB28CmqcOF7Vbc';

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
  const res = await req('/rest/v1/' + table + (query ? '?' + query : ''));
  if (!res.ok) {
    const t = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 300));
  }
  return await res.json();
}

export async function dbInsert(table, row) {
  const res = await req('/rest/v1/' + table, {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json().catch(() => null);
}

export async function dbUpdate(table, filter, patch) {
  const res = await req('/rest/v1/' + table + '?' + filter, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
}

export async function dbRpc(fn, args = {}) {
  const res = await req('/rest/v1/rpc/' + fn, {
    method: 'POST',
    body: JSON.stringify(args),
  });
  const text = await res.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { error: text }; }
  if (!res.ok) {
    const msg = (parsed && (parsed.error || parsed.message || parsed.hint)) || ('HTTP ' + res.status);
    throw new Error(msg);
  }
  return parsed;
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

export { SUPABASE_URL };
