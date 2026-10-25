const SUPABASE_URL = 'https://tksbqddskldnaafevmnl.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrc2JxZGRza2xkbmFhZmV2bW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzcxNjEsImV4cCI6MjEwODM1MzY2MX0.7wiyoe1Jdx6Xvq6oMc9vplLcuFRUuyB28CmqcOF7Vbc';

export async function dbSelect(table, query = '') {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : ''), {
    headers: {
      apikey: KEY,
      Authorization: 'Bearer ' + KEY,
      // Content-Type намеренно НЕ ставим: в GET он не нужен и вызывает лишний preflight
    },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + await res.text());
  return await res.json();
}

export async function dbRpc(fn, args = {}) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: 'Bearer ' + KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { error: text }; }
  if (!res.ok) {
    const msg = (parsed && (parsed.error || parsed.message)) || ('HTTP ' + res.status);
    throw new Error(msg);
  }
  return parsed;
}

export async function storageUpload(bucket, path, file) {
  const res = await fetch(SUPABASE_URL + '/storage/v1/object/' + bucket + '/' + path, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: 'Bearer ' + KEY,
      'x-upsert': 'true',
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });
  if (!res.ok) throw new Error('Upload HTTP ' + res.status);
  return await res.json();
}

export function storageUrl(bucket, path) {
  return SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + path;
}
