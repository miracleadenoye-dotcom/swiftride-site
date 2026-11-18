import { useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

/** Shares this device's position for a ride while `active` (Supabase Realtime picks up the upsert). */
export function useShareLocation(rideId: string | undefined, active: boolean) {
  const { session } = useAuth()
  useEffect(() => {
    if (!rideId || !active || !navigator.geolocation || !session) return
    let last = 0
    const id = navigator.geolocation.watchPosition(
      pos => {
        if (Date.now() - last < 5000) return
        last = Date.now()
        void supabase.from('ride_locations').upsert({
          ride_id: rideId, user_id: session.user.id,
          lat: pos.coords.latitude, lng: pos.coords.longitude, updated_at: new Date().toISOString(),
        })
      },
      () => { /* permission denied: sharing simply stays off */ },
      { enableHighAccuracy: true, maximumAge: 5000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [rideId, active, session])
}
