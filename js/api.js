const SUPABASE_URL = 'https://tksbqddskldnaafevmnl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrc2JxZGRza2xkbmFhZmV2bW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzcxNjEsImV4cCI6MjEwODM1MzE2MX0.7wiyoe1Jdx6Xvq6oMc9vplLcuFRUuyB28CmqcOF7Vbc';

const HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
};

// Один запрос с таймаутом
function fetchOnce(url, options, ms) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

// Запрос с повторами. Пробует 3 раза по 5 секунд.
async function fetchWithRetry(url, options = {}, ms = 5000, retries = 3) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetchOnce(url, options, ms);
      if (!res.ok && res.status >= 500) {
        // 5xx — серверная ошибка, попробуем ещё
        lastErr = new Error('HTTP ' + res.status);
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      // подождём перед повтором
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

export async function dbSelect(table, query = '') {
  const url = SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : '');
  const res = await fetchWithRetry(url, { headers: HEADERS });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + text.slice(0, 200));
  }
  return await res.json();
}

export async function dbInsert(table, row) {
  const url = SUPABASE_URL + '/rest/v1/' + table;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + text.slice(0, 200));
  }
  return await res.json();
}

export async function dbUpdate(table, filter, patch) {
  const url = SUPABASE_URL + '/rest/v1/' + table + '?' + filter;
  const res = await fetchWithRetry(url, {
    method: 'PATCH',
    headers: { ...HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + text.slice(0, 200));
  }
}

export async function dbRpc(fn, args = {}) {
  const url = SUPABASE_URL + '/rest/v1/rpc/' + fn;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + text.slice(0, 200));
  }
  return await res.json();
}

export async function storageUpload(bucket, path, file) {
  const url = SUPABASE_URL + '/storage/v1/object/' + bucket + '/' + path;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'x-upsert': 'true',
    },
    body: file,
  }, 20000, 2);
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Upload HTTP ' + res.status + ': ' + text.slice(0, 200));
  }
  return await res.json();
}

export function storageUrl(bucket, path) {
  return SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + path;
}
