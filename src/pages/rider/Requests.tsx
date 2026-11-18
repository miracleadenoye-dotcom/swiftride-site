import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { RIDE_COLS, naira, type Ride } from '../../lib/db'
import { ErrorBox, Spinner } from '../../components/ui'

export default function Requests() {
  const nav = useNavigate()
  const [rides, setRides] = useState<Ride[] | null>(null)
  const [hidden, setHidden] = useState<string[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('rides').select(RIDE_COLS).eq('status', 'pending').is('rider_id', null).order('created_at', { ascending: false })
      setRides((data as Ride[]) ?? [])
    }
    void load()
    const ch = supabase.channel('ride-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => void load())
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [])

  async function accept(id: string) {
    setErr(null)
    const { data, error } = await supabase.rpc('accept_ride', { p_ride: id })
    if (error) return setErr(error.message)
    if (!data) return setErr('Another rider already took this ride')
    nav(`/rider/trip/${id}`)
  }

  if (!rides) return <Spinner />
  const list = rides.filter(r => !hidden.includes(r.id))
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="text-2xl font-extrabold">Ride requests</h1>
      <ErrorBox msg={err} />
      {list.length === 0 && <p className="card text-slate-500">No requests right now. Stay online.</p>}
      {list.map(r => (
        <div key={r.id} className="card space-y-2">
          <p><b>From:</b> {r.pickup_name}</p>
          <p><b>To:</b> {r.dest_name}</p>
          <p className="text-sm text-slate-500">{r.distance_km} km · estimate {naira(r.fare)}</p>
          <p className="text-xl font-extrabold text-go-600">Offer: {r.offered_price ? naira(r.offered_price) : naira(r.fare)}</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => setHidden([...hidden, r.id])}>Reject</button>
            <button className="btn-go" onClick={() => accept(r.id)}>Accept</button>
          </div>
        </div>
      ))}
    </div>
  )
}
