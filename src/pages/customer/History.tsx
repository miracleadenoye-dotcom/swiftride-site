import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { RIDE_COLS, naira, type Ride } from '../../lib/db'
import { Spinner } from '../../components/ui'

export default function History() {
  const { session } = useAuth()
  const [rides, setRides] = useState<Ride[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    supabase.from('rides').select(RIDE_COLS).eq('customer_id', session!.user.id).order('created_at', { ascending: false }).limit(50)
      .then(({ data, error }) => { if (error) setErr(error.message); setRides((data as Ride[]) ?? []) })
  }, [session])
  if (!rides) return <Spinner />
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="text-2xl font-extrabold">Your trips</h1>
      {err && <p className="text-red-600">{err}</p>}
      {rides.length === 0 && <p className="card text-slate-500">No trips yet.</p>}
      {rides.map(r => (
        <Link key={r.id} to={`/customer/ride/${r.id}`} className="card block">
          <div className="flex justify-between"><b>{r.dest_name}</b><span className="font-bold">{naira(r.fare)}</span></div>
          <p className="text-sm text-slate-500">{new Date(r.created_at).toLocaleString()} · <span className="capitalize">{r.status}</span></p>
        </Link>
      ))}
    </div>
  )
}
