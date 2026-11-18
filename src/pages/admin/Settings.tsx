import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ErrorBox, Field, Spinner } from '../../components/ui'

type Row = Record<string, string | number | boolean | null> & { id: string }
interface Col { key: string; label: string; type?: 'text' | 'number' | 'select'; options?: string[] }

/** Small generic add / toggle / delete editor for admin-managed lists. */
function Crud({ title, table, cols, show }: { title: string; table: string; cols: Col[]; show: string[] }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [d, setD] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)
  const load = () => supabase.from(table).select('*').order(cols[0].key).limit(300).then(({ data, error }) => { if (error) setErr(error.message); setRows((data as Row[]) ?? []) })
  useEffect(() => { void load() }, [])

  async function add() {
    const payload: Record<string, string | number> = {}
    for (const c of cols) {
      const v = (d[c.key] ?? (c.type === 'select' ? c.options![0] : '')).trim()
      if (!v) return setErr(`${c.label} is required`)
      if (c.type === 'number') { const n = Number(v); if (!Number.isFinite(n)) return setErr(`${c.label} must be a number`); payload[c.key] = n } else payload[c.key] = v
    }
    const { error } = await supabase.from(table).insert(payload)
    setErr(error?.message ?? null); if (!error) { setD({}); void load() }
  }
  const toggle = async (r: Row) => { await supabase.from(table).update({ active: !r.active }).eq('id', r.id); void load() }
  const del = async (r: Row) => { if (confirm('Delete this item?')) { await supabase.from(table).delete().eq('id', r.id); void load() } }

  return (
    <section className="card space-y-3">
      <h2 className="text-lg font-bold">{title}</h2>
      <ErrorBox msg={err} />
      <div className="grid gap-2 md:grid-cols-4">
        {cols.map(c => c.type === 'select'
          ? <select key={c.key} className="field" value={d[c.key] ?? c.options![0]} onChange={e => setD({ ...d, [c.key]: e.target.value })}>{c.options!.map(o => <option key={o}>{o}</option>)}</select>
          : <input key={c.key} className="field" placeholder={c.label} inputMode={c.type === 'number' ? 'decimal' : undefined} value={d[c.key] ?? ''} onChange={e => setD({ ...d, [c.key]: e.target.value })} />)}
        <button className="btn-go" onClick={add}>Add</button>
      </div>
      {!rows ? <Spinner /> : (
        <ul className="divide-y divide-slate-100">
          {rows.map(r => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className={r.active ? '' : 'text-slate-400 line-through'}>{show.map(k => r[k]).join(' · ')}</span>
              <span className="flex gap-2"><button className="btn-ghost !min-h-0 !py-1 text-xs" onClick={() => toggle(r)}>{r.active ? 'Hide' : 'Show'}</button><button className="btn-ghost !min-h-0 !py-1 text-xs" onClick={() => del(r)}>Delete</button></span>
            </li>
          ))}
          {rows.length === 0 && <li className="py-2 text-slate-500">Nothing yet.</li>}
        </ul>
      )}
    </section>
  )
}

function Config() {
  const [pct, setPct] = useState('10'); const [kg, setKg] = useState('25'); const [size, setSize] = useState('')
  const [msg, setMsg] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    supabase.from('app_config').select('key, value').then(({ data }) => {
      for (const r of data ?? []) {
        if (r.key === 'commission') setPct(String(r.value.percent))
        if (r.key === 'load_limits') { setKg(String(r.value.max_weight_kg)); setSize(r.value.max_size) }
      }
    })
  }, [])
  async function save() {
    setErr(null); setMsg(null)
    const p = Number(pct), w = Number(kg)
    if (!(p >= 0 && p <= 50)) return setErr('Commission must be between 0 and 50%')
    if (!(w > 0 && w <= 500)) return setErr('Weight limit must be between 1 and 500 kg')
    const { error } = await supabase.from('app_config').upsert([{ key: 'commission', value: { percent: p } }, { key: 'load_limits', value: { max_weight_kg: w, max_size: size } }])
    error ? setErr(error.message) : setMsg('Saved')
  }
  return (
    <section className="card space-y-3">
      <h2 className="text-lg font-bold">Commission & load limits</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Platform commission (%)"><input className="field" inputMode="decimal" value={pct} onChange={e => setPct(e.target.value)} /></Field>
        <Field label="Max load weight (kg)"><input className="field" inputMode="decimal" value={kg} onChange={e => setKg(e.target.value)} /></Field>
        <Field label="Load size rule"><input className="field" value={size} onChange={e => setSize(e.target.value)} /></Field>
      </div>
      {msg && <p className="font-semibold text-go-600">{msg}</p>}<ErrorBox msg={err} />
      <button className="btn-go" onClick={save}>Save</button>
    </section>
  )
}

export default function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Platform settings</h1>
      <Config />
      <Crud title="Locations (towns & streets)" table="locations" show={['town', 'name']}
        cols={[{ key: 'town', label: 'Town' }, { key: 'name', label: 'Street / place' }, { key: 'lat', label: 'Latitude', type: 'number' }, { key: 'lng', label: 'Longitude', type: 'number' }]} />
      <Crud title="Price Padi phrases" table="price_padi_phrases" show={['verdict', 'title', 'phrase']}
        cols={[{ key: 'verdict', label: 'Verdict', type: 'select', options: ['fair', 'cheap', 'pricey', 'too_low'] }, { key: 'title', label: 'Title' }, { key: 'phrase', label: 'Phrase' }]} />
      <Crud title="Entry adverts" table="adverts" show={['title', 'body', 'audience']}
        cols={[{ key: 'title', label: 'Title' }, { key: 'body', label: 'Message' }, { key: 'audience', label: 'Audience', type: 'select', options: ['all', 'customer', 'rider'] }]} />
    </div>
  )
}
