import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { RIDE_COLS, naira, type Ride } from '../../lib/db'
import { useShareLocation } from '../../lib/useShareLocation'
import Map from '../../components/Map'
import { ErrorBox, Field, Spinner } from '../../components/ui'

export default function Trip() {
  const { id } = useParams()
  const nav = useNavigate()
  const [ride, setRide] = useState<Ride | null>(null)
  const [pin, setPin] = useState('')
  const [arrived, setArrived] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data } = await supabase.from('rides').select(RIDE_COLS).eq('id', id!).maybeSingle()
    setRide(data as Ride | null); setLoading(false)
  }
  useEffect(() => {
    void load()
    const ch = supabase.channel(`trip-${id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${id}` }, () => void load()).subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [id])

  useShareLocation(id, ride?.status === 'accepted' || ride?.status === 'ongoing')

  async function run(fn: () => Promise<string | null>) {
    setErr(null); setBusy(true); const e = await fn().catch(x => String(x.message ?? x)); setBusy(false); if (e) setErr(e); await load()
  }
  const arrive = () => run(async () => { const { error } = await supabase.rpc('rider_arrived', { p_ride: id }); if (!error) setArrived(true); return error?.message ?? null })
  const start = () => run(async () => {
    if (!/^\d{4}$/.test(pin)) return 'Enter the 4-digit PIN'
    const { data, error } = await supabase.rpc('start_ride', { p_ride: id, p_pin: pin })
    if (error) return error.message
    return data ? null : 'Wrong PIN. Ask the customer again.'
  })
  const finish = () => run(async () => { const { data, error } = await supabase.rpc('complete_ride', { p_ride: id }); return error?.message ?? (data ? null : 'Could not complete trip') })

  if (loading) return <Spinner />
  if (!ride) return <p className="card">Trip not found.</p>
  const price = ride.offered_price ?? ride.fare
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold capitalize">{ride.status === 'accepted' ? 'Go to pickup' : ride.status === 'ongoing' ? 'Trip in progress' : `Trip ${ride.status}`}</h1>
      <Map from={{ lat: ride.pickup_lat, lng: ride.pickup_lng }} to={{ lat: ride.dest_lat, lng: ride.dest_lng }} />
      <div className="card space-y-1">
        <p><b>Pickup:</b> {ride.pickup_name}</p><p><b>Destination:</b> {ride.dest_name}</p>
        <p className="text-xl font-extrabold text-go-600">{naira(price)}</p>
      </div>
      <ErrorBox msg={err} />
      {ride.status === 'accepted' && (
        <div className="card space-y-3">
          {!arrived && <button className="btn-navy w-full" disabled={busy} onClick={arrive}>I have arrived</button>}
          <Field label="Trip PIN from customer"><input className="field text-center text-2xl tracking-widest" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} /></Field>
          <button className="btn-go w-full" disabled={busy} onClick={start}>Start trip</button>
        </div>
      )}
      {ride.status === 'ongoing' && <button className="btn-go w-full" disabled={busy} onClick={finish}>Complete trip</button>}
      {(ride.status === 'completed' || ride.status === 'cancelled') && <button className="btn-navy w-full" onClick={() => nav('/rider')}>Back home</button>}
    </div>
  )
}
