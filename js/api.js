const SUPABASE_URL = 'https://tksbqddskldnaafevmnl.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrc2JxZGRza2xkbmFhZmV2bW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzcxNjEsImV4cCI6MjEwODM1MzE2MX0.7wiyoe1Jdx6Xvq6oMc9vplLcuFRUuyB28CmqcOF7Vbc';

function withApiKey(url) {
  return url + (url.includes('?') ? '&' : '?') + 'apikey=' + KEY;
}

function fetchOnce(url, options, ms) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

// 5 попыток: 1с, 2с, 4с, 6с, 8с
async function fetchWithRetry(url, options = {}) {
  const delays = [1000, 2000, 4000, 6000, 8000];
  let lastErr;
  for (let i = 0; i < delays.length; i++) {
    try {
      return await fetchOnce(url, options, delays[i]);
    } catch (err) {
      lastErr = err;
      if (i < delays.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }
  throw lastErr;
}

export async function dbSelect(table, query = '') {
  const url = withApiKey(SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : ''));
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    const t = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 200));
  }
  return await res.json();
}

export async function dbInsert(table, row) {
  const url = withApiKey(SUPABASE_URL + '/rest/v1/' + table);
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 200));
  }
  return await res.json();
}

export async function dbUpdate(table, filter, patch) {
  const url = withApiKey(SUPABASE_URL + '/rest/v1/' + table + '?' + filter);
  const res = await fetchWithRetry(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 200));
  }
}

export async function dbRpc(fn, args = {}) {
  const url = withApiKey(SUPABASE_URL + '/rest/v1/rpc/' + fn);
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 200));
  }
  return await res.json();
}

export async function storageUpload(bucket, path, file) {
  const url = withApiKey(SUPABASE_URL + '/storage/v1/object/' + bucket + '/' + path);
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'x-upsert': 'true' },
    body: file,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('Upload HTTP ' + res.status + ': ' + t.slice(0, 200));
  }
  return await res.json();
}

export function storageUrl(bucket, path) {
  return SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + path;
}
