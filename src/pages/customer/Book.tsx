import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { distanceKm, estimateFare, padiVerdict } from '../../lib/fare'
import { naira } from '../../lib/db'
import Map, { type Pt } from '../../components/Map'
import { ErrorBox, Field, Spinner } from '../../components/ui'

interface Loc { id: string; town: string; name: string; lat: number; lng: number }
interface Grade { id: string; name: string; description: string | null; base_fare: number; per_km: number; min_fare: number; vehicle_categories: { name: string } | null }
interface Phrase { verdict: string; title: string; phrase: string }
interface Place { name: string; lat: number; lng: number }

function PlacePicker({ label, locs, value, onChange }: { label: string; locs: Loc[]; value: Place | null; onChange: (p: Place) => void }) {
  const [q, setQ] = useState(value?.name ?? '')
  const hits = useMemo(() => q.trim().length < 1 ? [] : locs.filter(l => `${l.name} ${l.town}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6), [q, locs])
  return (
    <div className="relative">
      <Field label={label}>
        <input className="field" value={q} onChange={e => setQ(e.target.value)} placeholder="Search town or street" />
      </Field>
      {hits.length > 0 && value?.name !== q && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {hits.map(h => (
            <li key={h.id}><button type="button" className="w-full px-4 py-3 text-left hover:bg-slate-50"
              onClick={() => { const n = `${h.name}, ${h.town}`; setQ(n); onChange({ name: n, lat: h.lat, lng: h.lng }) }}>
              <b>{h.name}</b> <span className="text-sm text-slate-500">{h.town}</span></button></li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Book() {
  const { session } = useAuth()
  const nav = useNavigate()
  const [locs, setLocs] = useState<Loc[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [limits, setLimits] = useState<{ max_weight_kg: number; max_size: string } | null>(null)
  const [padiName, setPadiName] = useState('Price Padi')
  const [loading, setLoading] = useState(true)

  const [from, setFrom] = useState<Place | null>(null)
  const [to, setTo] = useState<Place | null>(null)
  const [pickMode, setPickMode] = useState<'from' | 'to' | null>(null)
  const [gradeId, setGradeId] = useState('')
  const [offer, setOffer] = useState('')
  const [isLoad, setIsLoad] = useState(false)
  const [loadDesc, setLoadDesc] = useState('')
  const [loadKg, setLoadKg] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    (async () => {
      const [l, g, p, c, me] = await Promise.all([
        supabase.from('locations').select('*').eq('active', true).order('name'),
        supabase.from('vehicle_grades').select('*, vehicle_categories(name)').eq('active', true),
        supabase.from('price_padi_phrases').select('verdict,title,phrase').eq('active', true),
        supabase.from('app_config').select('value').eq('key', 'load_limits').maybeSingle(),
        supabase.from('profiles').select('price_padi_name').eq('id', session!.user.id).maybeSingle(),
      ])
      setLocs((l.data as Loc[]) ?? []); setGrades((g.data as Grade[]) ?? []); setPhrases((p.data as Phrase[]) ?? [])
      setLimits((c.data?.value as typeof limits) ?? null)
      if (me.data?.price_padi_name) setPadiName(me.data.price_padi_name)
      if (g.data?.[0]) setGradeId(g.data[0].id)
      setLoading(false)
    })()
  }, [session])

  const grade = grades.find(g => g.id === gradeId)
  const km = from && to ? distanceKm(from.lat, from.lng, to.lat, to.lng) : null
  const estimate = km != null && grade ? estimateFare(km, grade) : null
  const offerN = Number(offer)
  const verdict = estimate && offerN > 0 ? padiVerdict(offerN, estimate) : null
  const said = verdict ? phrases.find(p => p.verdict === verdict) : null

  function mapPick(p: Pt) {
    if (!pickMode) return
    const place = { name: `Map point (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})`, lat: p.lat, lng: p.lng }
    pickMode === 'from' ? setFrom(place) : setTo(place); setPickMode(null)
  }

  async function request() {
    setErr(null)
    if (!from || !to || km == null || !estimate || !grade) return setErr('Choose pickup, destination and vehicle')
    if (from.lat === to.lat && from.lng === to.lng) return setErr('Pickup and destination are the same')
    if (!(offerN >= 100 && offerN <= 100000)) return setErr('Enter your offer in naira')
    if (isLoad) {
      if (loadDesc.trim().length < 3) return setErr('Describe the item you are sending')
      if (limits && Number(loadKg) > limits.max_weight_kg) return setErr(`Max load weight is ${limits.max_weight_kg}kg`)
    }
    setBusy(true)
    const { data, error } = await supabase.from('rides').insert({
      customer_id: session!.user.id, pickup_name: from.name, pickup_lat: from.lat, pickup_lng: from.lng,
      dest_name: to.name, dest_lat: to.lat, dest_lng: to.lng, distance_km: km, fare: estimate, offered_price: offerN,
      vehicle_grade_id: grade.id, status: 'pending',
      is_load: isLoad, load_description: isLoad ? loadDesc.trim() : null, load_weight_kg: isLoad && loadKg ? Number(loadKg) : null,
    }).select('id').single()
    setBusy(false)
    if (error) return setErr(error.message)
    nav(`/customer/ride/${data.id}`)
  }

  if (loading) return <Spinner />
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold">Book a ride</h1>
      <PlacePicker label="Pickup" locs={locs} value={from} onChange={setFrom} />
      <PlacePicker label="Destination" locs={locs} value={to} onChange={setTo} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-ghost" onClick={() => setPickMode('from')}>Pick pickup on map</button>
        <button type="button" className="btn-ghost" onClick={() => setPickMode('to')}>Pick destination on map</button>
      </div>
      {pickMode && <p className="text-sm font-semibold text-go-600">Tap the map to set the {pickMode === 'from' ? 'pickup' : 'destination'}.</p>}
      <Map from={from} to={to} onPick={mapPick} />

      <Field label="Vehicle">
        <select className="field" value={gradeId} onChange={e => setGradeId(e.target.value)}>
          {grades.map(g => <option key={g.id} value={g.id}>{g.vehicle_categories?.name} · {g.name}</option>)}
        </select>
      </Field>

      {estimate != null && (
        <div className="card">
          <p className="text-sm text-slate-500">{km} km · estimated fare</p>
          <p className="text-3xl font-extrabold text-navy-900">{naira(estimate)}</p>
        </div>
      )}

      <Field label="Name your price (₦)">
        <input className="field" inputMode="numeric" value={offer} onChange={e => setOffer(e.target.value.replace(/\D/g, ''))} placeholder="Your offer" />
      </Field>
      {said && (
        <div className="card border-l-4 border-l-go-500">
          <p className="text-xs font-bold uppercase text-slate-400">{padiName} says</p>
          <p className="font-extrabold">{said.title}</p>
          <p className="text-sm text-slate-600">{said.phrase}</p>
          <p className="mt-1 text-xs text-slate-400">Just advice. You can still book at your price.</p>
        </div>
      )}

      <label className="flex items-center gap-3 font-semibold"><input type="checkbox" className="h-5 w-5" checked={isLoad} onChange={e => setIsLoad(e.target.checked)} /> Carry a load</label>
      {isLoad && (
        <div className="card space-y-3">
          <Field label="What are you sending?"><input className="field" value={loadDesc} onChange={e => setLoadDesc(e.target.value)} maxLength={200} /></Field>
          <Field label={`Weight in kg${limits ? ` (max ${limits.max_weight_kg})` : ''}`}><input className="field" inputMode="decimal" value={loadKg} onChange={e => setLoadKg(e.target.value)} /></Field>
          {limits && <p className="text-xs text-slate-500">Size limit: {limits.max_size}</p>}
        </div>
      )}

      <ErrorBox msg={err} />
      <button className="btn-go w-full" disabled={busy} onClick={request}>{busy ? 'Requesting…' : 'Request ride'}</button>
    </div>
  )
}
