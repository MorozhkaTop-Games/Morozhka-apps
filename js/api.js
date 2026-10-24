const SUPABASE_URL = 'https://tksbqddskldnaafevmnl.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrc2JxZGRza2xkbmFhZmV2bW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzcxNjEsImV4cCI6MjEwODM1MzE2MX0.7wiyoe1Jdx6Xvq6oMc9vplLcuFRUuyB28CmqcOF7Vbc';

const HEADERS = {
  'apikey': KEY,
  'Authorization': 'Bearer ' + KEY,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

async function fetchWithTimeout(url, options = {}, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...options,
      headers: { ...HEADERS, ...(options.headers || {}) },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

export async function dbSelect(table, query = '') {
  const url = SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : '');
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    const t = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 200));
  }
  return await res.json();
}

export async function dbInsert(table, row) {
  const url = SUPABASE_URL + '/rest/v1/' + table;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 200));
  }
  return await res.json();
}

export async function dbUpdate(table, filter, patch) {
  const url = SUPABASE_URL + '/rest/v1/' + table + '?' + filter;
  const res = await fetchWithTimeout(url, {
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
  const url = SUPABASE_URL + '/rest/v1/rpc/' + fn;
  const res = await fetchWithTimeout(url, {
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
  const url = SUPABASE_URL + '/storage/v1/object/' + bucket + '/' + path;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'x-upsert': 'true' },
    body: file,
  }, 30000);
  if (!res.ok) {
    const t = await res.text();
    throw new Error('Upload HTTP ' + res.status + ': ' + t.slice(0, 200));
  }
  return await res.json();
}

export function storageUrl(bucket, path) {
  return SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + path;
}
