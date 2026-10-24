const SUPABASE_URL = 'https://tksbqddskldnaafevmnl.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrc2JxZGRza2xkbmFhZmV2bW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzcxNjEsImV4cCI6MjEwODM1MzE2MX0.7wiyoe1Jdx6Xvq6oMc9vplLcuFRUuyB28CmqcOF7Vbc';

// Прокси: обходит прямой доступ браузера к supabase.co
const PROXY = 'https://corsproxy.io/?url=';

const HEADERS = {
  'apikey': KEY,
  'Authorization': 'Bearer ' + KEY,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

function buildUrl(path) {
  // path — это '/rest/v1/apps?...' или '/storage/v1/...'
  return PROXY + encodeURIComponent(SUPABASE_URL + path);
}

async function fetchWithTimeout(url, options = {}, ms = 20000) {
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
  const path = '/rest/v1/' + table + (query ? '?' + query : '');
  const res = await fetchWithTimeout(buildUrl(path));
  if (!res.ok) {
    const t = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 200));
  }
  return await res.json();
}

export async function dbInsert(table, row) {
  const path = '/rest/v1/' + table;
  const res = await fetchWithTimeout(buildUrl(path), {
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
  const path = '/rest/v1/' + table + '?' + filter;
  const res = await fetchWithTimeout(buildUrl(path), {
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
  const path = '/rest/v1/rpc/' + fn;
  const res = await fetchWithTimeout(buildUrl(path), {
    method: 'POST',
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 200));
  }
  return await res.json();
}

export async function storageUpload(bucket, pathInBucket, file) {
  const path = '/storage/v1/object/' + bucket + '/' + pathInBucket;
  const res = await fetchWithTimeout(buildUrl(path), {
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

export function storageUrl(bucket, pathInBucket) {
  return SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + pathInBucket;
}
