import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.50.0/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return data;
}

export function pageForRole(role) {
  if (role === 'rider') return 'rider.html';
  if (role === 'admin') return 'customer.html';
  return 'customer.html';
}

export async function requireRole(role) {
  const profile = await getProfile();
  if (!profile) { window.location.replace('signin.html'); return null; }
  if (profile.blocked) {
    await supabase.auth.signOut();
    window.location.replace('signin.html?blocked=1');
    return null;
  }
  if (profile.role !== role) { window.location.replace(pageForRole(profile.role)); return null; }
  return profile;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.replace('index.html');
}

export function showMessage(el, text, ok = false) {
  el.textContent = text;
  el.hidden = !text;
  el.className = 'msg ' + (ok ? 'ok' : 'err');
}
