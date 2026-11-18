import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { RIDE_COLS, naira, type Ride } from '../../lib/db'
import { useAuth } from '../../lib/auth'
import { useShareLocation } from '../../lib/useShareLocation'
import Map, { type Pt } from '../../components/Map'
import { Spinner } from '../../components/ui'

const label: Record<string, string> = { pending: 'Waiting for a rider…', accepted: 'Rider is on the way', ongoing: 'Trip in progress', completed: 'Trip completed', cancelled: 'Cancelled' }

export default function ActiveRide() {
  const { id } = useParams()
  const nav = useNavigate()
  const { session } = useAuth()
  const [live, setLive] = useState<Pt | null>(null)
  const [ride, setRide] = useState<Ride | null>(null)
  const [pin, setPin] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const load = async () => {
      const { data } = await supabase.from('rides').select(RIDE_COLS).eq('id', id!).maybeSingle()
      if (alive) { setRide(data as Ride | null); setLoading(false) }
    }
    void load()
    supabase.from('ride_pins').select('pin').eq('ride_id', id!).maybeSingle().then(({ data }) => alive && setPin(data?.pin ?? null))
    const ch = supabase.channel(`ride-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${id}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_locations', filter: `ride_id=eq.${id}` },
        (p: { new: { user_id?: string; lat?: number; lng?: number } }) => {
          if (p.new?.user_id && p.new.user_id !== session?.user.id && p.new.lat != null && p.new.lng != null) setLive({ lat: p.new.lat, lng: p.new.lng })
        })
      .subscribe()
    return () => { alive = false; void supabase.removeChannel(ch) }
  }, [id, session])
  useShareLocation(id, ride?.status === 'accepted' || ride?.status === 'ongoing')

  async function cancel() {
    if (!confirm('Cancel this ride?')) return
    await supabase.from('rides').update({ status: 'cancelled' }).eq('id', id!).in('status', ['pending', 'accepted'])
  }

  if (loading) return <Spinner />
  if (!ride) return <p className="card">Ride not found.</p>
  const active = ride.status === 'pending' || ride.status === 'accepted' || ride.status === 'ongoing'
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold">{label[ride.status]}</h1>
      <Map from={{ lat: ride.pickup_lat, lng: ride.pickup_lng }} to={{ lat: ride.dest_lat, lng: ride.dest_lng }} live={live} />
      <div className="card space-y-1">
        <p><b>From:</b> {ride.pickup_name}</p>
        <p><b>To:</b> {ride.dest_name}</p>
        <p><b>Estimate:</b> {naira(ride.fare)} · <b>Your offer:</b> {ride.offered_price ? naira(ride.offered_price) : '-'}</p>
      </div>
      {pin && ride.status !== 'completed' && ride.status !== 'cancelled' && (
        <div className="card text-center">
          <p className="text-sm text-slate-500">Trip PIN. Give it to your rider to start the trip.</p>
          <p className="text-4xl font-extrabold tracking-[0.4em]">{pin}</p>
        </div>
      )}
      {active && ride.status !== 'ongoing' && <button className="btn-ghost w-full" onClick={cancel}>Cancel ride</button>}
      {!active && <button className="btn-navy w-full" onClick={() => nav('/customer')}>Back home</button>}
    </div>
  )
}
