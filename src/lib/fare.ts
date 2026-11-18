export interface FareRule { base_fare: number; per_km: number; min_fare: number }
export type Verdict = 'fair' | 'cheap' | 'pricey' | 'too_low'

/** Straight-line distance x 1.3 road factor, in km. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.3 * 10) / 10
}

/** Prototype: Fare = max(500, 300 + 120 x km). Values come from the selected vehicle grade (admin-editable). */
export function estimateFare(km: number, r: FareRule = { base_fare: 300, per_km: 120, min_fare: 500 }) {
  return Math.round(Math.max(r.min_fare, r.base_fare + r.per_km * km))
}

/** Price Padi: rule-based advice only. Never blocks. Compares the customer's offer to the app estimate. */
export function padiVerdict(offer: number, estimate: number): Verdict {
  const ratio = offer / estimate
  if (ratio < 0.7) return 'too_low'
  if (ratio < 0.95) return 'cheap'
  if (ratio <= 1.25) return 'fair'
  return 'pricey'
}

export function newPin() {
  const a = new Uint32Array(1); crypto.getRandomValues(a)
  return String(a[0] % 10000).padStart(4, '0')
}
