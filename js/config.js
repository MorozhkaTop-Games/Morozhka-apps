import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://tksbqddskldnaafevmnl.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrc2JxZGRza2xkbmFhZmV2bW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzcxNjEsImV4cCI6MjEwODM1MzY2MX0.7wiyoe1Jdx6Xvq6oMc9vplLcuFRUuyB28CmqcOF7Vbc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

export function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}
export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU');
}
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
