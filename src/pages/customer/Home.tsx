import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Spinner } from '../../components/ui'

export default function CustomerHome() {
  const { session } = useAuth()
  const [name, setName] = useState<string | null>(null)
  const [padi, setPadi] = useState<string | null>(null)
  const [ad, setAd] = useState<{ title: string; body: string | null } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const uid = session!.user.id
      const [{ data: p }, { data: a }] = await Promise.all([
        supabase.from('profiles').select('full_name, price_padi_name').eq('id', uid).maybeSingle(),
        supabase.from('adverts').select('title, body').eq('active', true).in('audience', ['all', 'customer']).limit(1),
      ])
      setName(p?.full_name?.split(' ')[0] ?? null); setPadi(p?.price_padi_name ?? null); setAd(a?.[0] ?? null)
      setLoading(false)
    })()
  }, [session])

  if (loading) return <Spinner />
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Hi, {name ?? 'there'} 👋</h1>
      {ad && <div className="card border-l-4 border-l-go-500"><p className="text-xs font-bold uppercase text-slate-400">Sponsored</p><p className="font-bold">{ad.title}</p><p className="text-sm text-slate-600">{ad.body}</p></div>}
      {padi && <p className="text-sm text-slate-600">Your Price Padi: <b>{padi}</b></p>}
      <Link to="/customer/book" className="btn-go w-full">Book a ride</Link>
    </div>
  )
}
