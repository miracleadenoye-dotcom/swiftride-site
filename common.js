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

export async function avatarUrl(path) {
  if (!path) return null;
  const { data } = await supabase.storage.from('photos').createSignedUrl(path, 3600);
  return data ? data.signedUrl : null;
}

export function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// Shrinks a chosen photo to at most 800px and returns a JPEG blob
export function shrinkImage(file, max = 800) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => b ? resolve(b) : reject(new Error('Could not read this photo')), 'image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Could not read this photo'));
    img.src = URL.createObjectURL(file);
  });
}
