import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

interface Ad { id: string; title: string; body: string | null; image_url: string | null; link_url: string | null }

/** Sponsored splash shown once per session when a user enters the app (managed by admin in Settings > Entry adverts). */
export default function EntryAdvert() {
  const { role } = useAuth()
  const [ad, setAd] = useState<Ad | null>(null)
  useEffect(() => {
    if (sessionStorage.getItem('sm_ad_seen') || (role !== 'customer' && role !== 'rider')) return
    const now = new Date().toISOString()
    supabase.from('adverts').select('id, title, body, image_url, link_url, starts_at, ends_at').eq('active', true).in('audience', ['all', role])
      .then(({ data }) => {
        const live = (data ?? []).find(a => (!a.starts_at || a.starts_at <= now) && (!a.ends_at || a.ends_at >= now))
        if (live) setAd(live as Ad)
      })
  }, [role])
  if (!ad) return null
  const close = () => { sessionStorage.setItem('sm_ad_seen', '1'); setAd(null) }
  const safe = ad.link_url && /^https?:\/\//.test(ad.link_url) ? ad.link_url : null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/70 p-4 md:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5">
        <p className="text-xs font-bold uppercase text-slate-400">Sponsored</p>
        {ad.image_url && /^https?:\/\//.test(ad.image_url) && <img src={ad.image_url} alt="" className="h-36 w-full rounded-xl object-cover" />}
        <h2 className="text-xl font-extrabold">{ad.title}</h2>
        {ad.body && <p className="text-slate-600">{ad.body}</p>}
        {safe && <a href={safe} target="_blank" rel="noopener noreferrer" className="btn-navy w-full">Learn more</a>}
        <button className="btn-go w-full" onClick={close}>Continue</button>
      </div>
    </div>
  )
}
