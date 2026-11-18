import { MapContainer, TileLayer, CircleMarker, Polyline, useMapEvents } from 'react-leaflet'

export interface Pt { lat: number; lng: number }

function Clicker({ onPick }: { onPick?: (p: Pt) => void }) {
  useMapEvents({ click: e => onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

/** Leaflet + OpenStreetMap (free). Circle markers avoid the bundler icon-path issue. */
export default function Map({ from, to, live, onPick }: { from?: Pt | null; to?: Pt | null; live?: Pt | null; onPick?: (p: Pt) => void }) {
  const c = from ?? to ?? { lat: 7.62, lng: 5.22 }
  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer center={[c.lat, c.lng]} zoom={14} scrollWheelZoom={false}>
        <TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Clicker onPick={onPick} />
        {from && <CircleMarker center={[from.lat, from.lng]} radius={9} pathOptions={{ color: '#000033', fillColor: '#000033', fillOpacity: 1 }} />}
        {to && <CircleMarker center={[to.lat, to.lng]} radius={9} pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1 }} />}
        {live && <CircleMarker center={[live.lat, live.lng]} radius={7} pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 1 }} />}
        {from && to && <Polyline positions={[[from.lat, from.lng], [to.lat, to.lng]]} pathOptions={{ color: '#001b44', dashArray: '6' }} />}
      </MapContainer>
    </div>
  )
}
