import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ErrorBox, Field, Spinner } from '../components/ui'

interface C { id: string; name: string; phone: string }
interface P { id: string; label: string; name: string }

/** Emergency contacts (all users) and saved places. */
export default function Safety() {
  const { session } = useAuth()
  const uid = session!.user.id
  const [contacts, setContacts] = useState<C[] | null>(null)
  const [places, setPlaces] = useState<P[]>([])
  const [c, setC] = useState({ name: '', phone: '' })
  const [p, setP] = useState({ label: '', locId: '' })
  const [locs, setLocs] = useState<{ id: string; town: string; name: string; lat: number; lng: number }[]>([])
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    const [a, b, l] = await Promise.all([
      supabase.from('emergency_contacts').select('id, name, phone').eq('user_id', uid),
      supabase.from('saved_places').select('id, label, name').eq('user_id', uid),
      supabase.from('locations').select('id, town, name, lat, lng').eq('active', true).order('name'),
    ])
    setContacts((a.data as C[]) ?? []); setPlaces((b.data as P[]) ?? []); setLocs(l.data ?? [])
  }
  useEffect(() => { void load() }, [])

  async function addContact() {
    setErr(null)
    if (c.name.trim().length < 2) return setErr('Enter a name')
    if (!/^(\+234|0)[789]\d{9}$/.test(c.phone.trim())) return setErr('Enter a valid Nigerian phone number')
    if ((contacts?.length ?? 0) >= 5) return setErr('You can save up to 5 contacts')
    const { error } = await supabase.from('emergency_contacts').insert({ user_id: uid, name: c.name.trim(), phone: c.phone.trim() })
    if (error) return setErr(error.message); setC({ name: '', phone: '' }); void load()
  }
  async function addPlace() {
    setErr(null)
    const l = locs.find(x => x.id === p.locId)
    if (!p.label.trim() || !l) return setErr('Enter a label and choose a place')
    const { error } = await supabase.from('saved_places').insert({ user_id: uid, label: p.label.trim(), name: `${l.name}, ${l.town}`, lat: l.lat, lng: l.lng })
    if (error) return setErr(error.message); setP({ label: '', locId: '' }); void load()
  }

  if (!contacts) return <Spinner />
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-extrabold">Safety</h1>
      <ErrorBox msg={err} />
      <section className="space-y-3">
        <h2 className="font-bold">Emergency contacts</h2>
        {contacts.map(x => <div key={x.id} className="card flex items-center justify-between"><span><b>{x.name}</b><br /><a className="text-sm text-slate-500 underline" href={`tel:${x.phone}`}>{x.phone}</a></span>
          <button className="btn-ghost !min-h-0 !py-1.5 text-xs" onClick={async () => { await supabase.from('emergency_contacts').delete().eq('id', x.id); void load() }}>Remove</button></div>)}
        <div className="card space-y-3">
          <Field label="Name"><input className="field" value={c.name} onChange={e => setC({ ...c, name: e.target.value })} /></Field>
          <Field label="Phone"><input className="field" inputMode="tel" value={c.phone} onChange={e => setC({ ...c, phone: e.target.value })} /></Field>
          <button className="btn-navy w-full" onClick={addContact}>Add contact</button>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="font-bold">Saved places</h2>
        {places.map(x => <div key={x.id} className="card flex items-center justify-between"><span><b>{x.label}</b><br /><span className="text-sm text-slate-500">{x.name}</span></span>
          <button className="btn-ghost !min-h-0 !py-1.5 text-xs" onClick={async () => { await supabase.from('saved_places').delete().eq('id', x.id); void load() }}>Remove</button></div>)}
        <div className="card space-y-3">
          <Field label="Label (Home, Work…)"><input className="field" value={p.label} onChange={e => setP({ ...p, label: e.target.value })} /></Field>
          <Field label="Place"><select className="field" value={p.locId} onChange={e => setP({ ...p, locId: e.target.value })}><option value="">Choose…</option>{locs.map(l => <option key={l.id} value={l.id}>{l.name}, {l.town}</option>)}</select></Field>
          <button className="btn-navy w-full" onClick={addPlace}>Save place</button>
        </div>
      </section>
    </div>
  )
}
