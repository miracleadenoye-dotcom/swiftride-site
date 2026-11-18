// ASSUMED COLUMN NAMES (verify against the real SWIFTRIDE schema, then fix here only).
// rides: id, customer_id, rider_id, pickup_name, pickup_lat, pickup_lng, dest_name, dest_lat, dest_lng,
//        distance_km, fare, offered_price, status, trip_pin, vehicle_grade_id, is_load, load_*, created_at
// profiles: id, full_name, phone, email, price_padi_name, avatar_path
export const RIDE_COLS = 'id, customer_id, rider_id, pickup_name, dest_name, pickup_lat, pickup_lng, dest_lat, dest_lng, distance_km, fare, offered_price, status, trip_pin, created_at'

export type RideStatus = 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled'

export interface Ride {
  id: string; customer_id: string; rider_id: string | null
  pickup_name: string; dest_name: string
  pickup_lat: number; pickup_lng: number; dest_lat: number; dest_lng: number
  distance_km: number; fare: number; offered_price: number | null
  status: RideStatus; trip_pin: string | null; created_at: string
}

export const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG')
