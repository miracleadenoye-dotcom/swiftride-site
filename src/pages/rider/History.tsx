import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { RIDE_COLS, naira, type Ride } from '../../lib/db'
import { Spinner } from '../../components/ui'

export function RiderTrips() {
  const { session } = useAuth()
  const [rides, setRides] = useState<Ride[] | null>(null)
  useEffect(() => {
    supabase.from('rides').select(RIDE_COLS).eq('rider_id', session!.user.id).order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setRides((data as Ride[]) ?? []))
  }, [session])
  if (!rides) return <Spinner />
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="text-2xl font-extrabold">Trip history</h1>
      {rides.length === 0 && <p className="card text-slate-500">No trips yet.</p>}
      {rides.map(r => (
        <Link key={r.id} to={`/rider/trip/${r.id}`} className="card block">
          <div className="flex justify-between"><b>{r.dest_name}</b><span className="font-bold">{naira(r.offered_price ?? r.fare)}</span></div>
          <p className="text-sm text-slate-500">{new Date(r.created_at).toLocaleString()} · <span className="capitalize">{r.status}</span></p>
        </Link>
      ))}
    </div>
  )
}

interface Tx { kind: string; amount: number; note: string | null; created_at: string }

export function Earnings() {
  const { session } = useAuth()
  const [tx, setTx] = useState<Tx[] | null>(null)
  const [balance, setBalance] = useState(0)
  useEffect(() => {
    (async () => {
      const uid = session!.user.id
      const [{ data: t }, { data: w }] = await Promise.all([
        supabase.from('wallet_transactions').select('kind, amount, note, created_at').eq('user_id', uid).in('kind', ['earning', 'commission']).order('created_at', { ascending: false }).limit(200),
        supabase.from('wallets').select('balance').eq('user_id', uid).maybeSingle(),
      ])
      setTx((t as Tx[]) ?? []); setBalance(w?.balance ?? 0)
    })()
  }, [session])
  if (!tx) return <Spinner />
  const now = new Date()
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const sum = (since: number) => tx.filter(t => t.kind === 'earning' && new Date(t.created_at).getTime() >= since).reduce((a, t) => a + Number(t.amount), 0)
  const cards = [['Today', sum(startDay)], ['This week', sum(startDay - 6 * 864e5)], ['This month', sum(new Date(now.getFullYear(), now.getMonth(), 1).getTime())]] as const
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold">Earnings</h1>
      <div className="grid grid-cols-3 gap-2">
        {cards.map(([l, v]) => <div key={l} className="card text-center"><p className="text-xs text-slate-500">{l}</p><p className="font-extrabold">{naira(v)}</p></div>)}
      </div>
      <div className="card"><p className="text-sm text-slate-500">Wallet balance (paid via app)</p><p className="text-2xl font-extrabold">{naira(balance)}</p></div>
      <h2 className="font-bold">Payments</h2>
      {tx.filter(t => t.kind === 'earning').map((t, i) => (
        <div key={i} className="card flex justify-between"><span>{t.note}<br /><span className="text-xs text-slate-400">{new Date(t.created_at).toLocaleString()}</span></span><b className="text-go-600">{naira(Number(t.amount))}</b></div>
      ))}
    </div>
  )
}
