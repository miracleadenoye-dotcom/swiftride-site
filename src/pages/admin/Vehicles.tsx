import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ErrorBox, Field, Spinner } from '../../components/ui'

interface Cat { id: string; name: string; description: string | null; active: boolean }
interface Grade { id: string; category_id: string; name: string; description: string | null; base_fare: number; per_km: number; min_fare: number; active: boolean }

export default function Vehicles() {
  const [cats, setCats] = useState<Cat[] | null>(null)
  const [grades, setGrades] = useState<Grade[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [newCat, setNewCat] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})

  const load = async () => {
    const [c, g] = await Promise.all([supabase.from('vehicle_categories').select('*').order('sort'), supabase.from('vehicle_grades').select('*').order('name')])
    setCats((c.data as Cat[]) ?? []); setGrades((g.data as Grade[]) ?? [])
  }
  useEffect(() => { void load() }, [])
  const done = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; setErr(error?.message ?? null); void load() }

  const num = (v: string, min = 0, max = 1e6) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? n : null }

  function saveGrade(g: Grade) {
    if ([g.base_fare, g.per_km, g.min_fare].some(v => num(String(v)) === null) || !g.name.trim()) return setErr('Enter a name and valid fare numbers')
    void done(supabase.from('vehicle_grades').update({ name: g.name.trim(), description: g.description, base_fare: g.base_fare, per_km: g.per_km, min_fare: g.min_fare, active: g.active }).eq('id', g.id))
  }
  const edit = (id: string, patch: Partial<Grade>) => setGrades(grades.map(g => g.id === id ? { ...g, ...patch } : g))

  if (!cats) return <Spinner />
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Vehicles & fares</h1>
      <ErrorBox msg={err} />
      <p className="text-sm text-slate-500">Fare = max(minimum, base + per-km × distance). Customers only see active categories and grades.</p>
      {cats.map(c => (
        <section key={c.id} className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{c.name} {!c.active && <span className="text-xs text-red-600">(hidden)</span>}</h2>
            <div className="flex gap-2">
              <button className="btn-ghost !min-h-0 !py-1.5 text-xs" onClick={() => done(supabase.from('vehicle_categories').update({ active: !c.active }).eq('id', c.id))}>{c.active ? 'Hide' : 'Show'}</button>
              <button className="btn-ghost !min-h-0 !py-1.5 text-xs" onClick={() => confirm('Delete category and its grades?') && done(supabase.from('vehicle_categories').delete().eq('id', c.id))}>Delete</button>
            </div>
          </div>
          {grades.filter(g => g.category_id === c.id).map(g => (
            <div key={g.id} className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-6">
              <input className="field md:col-span-2" value={g.name} onChange={e => edit(g.id, { name: e.target.value })} aria-label="Grade name" />
              <input className="field" inputMode="numeric" value={g.base_fare} onChange={e => edit(g.id, { base_fare: e.target.value as unknown as number })} aria-label="Base fare" title="Base fare" />
              <input className="field" inputMode="numeric" value={g.per_km} onChange={e => edit(g.id, { per_km: e.target.value as unknown as number })} aria-label="Per km" title="Per km" />
              <input className="field" inputMode="numeric" value={g.min_fare} onChange={e => edit(g.id, { min_fare: e.target.value as unknown as number })} aria-label="Minimum fare" title="Minimum fare" />
              <input className="field col-span-2 md:col-span-4" placeholder="Description (what customers see)" value={g.description ?? ''} onChange={e => edit(g.id, { description: e.target.value })} />
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={g.active} onChange={e => edit(g.id, { active: e.target.checked })} /> Active</label>
              <div className="flex gap-2"><button className="btn-go !min-h-0 !py-2 text-sm" onClick={() => saveGrade({ ...g, base_fare: Number(g.base_fare), per_km: Number(g.per_km), min_fare: Number(g.min_fare) })}>Save</button>
                <button className="btn-ghost !min-h-0 !py-2 text-sm" onClick={() => confirm('Delete grade?') && done(supabase.from('vehicle_grades').delete().eq('id', g.id))}>✕</button></div>
            </div>
          ))}
          <div className="flex gap-2">
            <input className="field" placeholder="New grade name (e.g. Premium)" value={draft[c.id] ?? ''} onChange={e => setDraft({ ...draft, [c.id]: e.target.value })} />
            <button className="btn-navy" onClick={() => { const n = (draft[c.id] ?? '').trim(); if (n) { void done(supabase.from('vehicle_grades').insert({ category_id: c.id, name: n })); setDraft({ ...draft, [c.id]: '' }) } }}>Add grade</button>
          </div>
        </section>
      ))}
      <Field label="Add category">
        <div className="flex gap-2"><input className="field" value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="e.g. Car, Tricycle" />
          <button className="btn-go" onClick={() => { if (newCat.trim()) { void done(supabase.from('vehicle_categories').insert({ name: newCat.trim() })); setNewCat('') } }}>Add</button></div>
      </Field>
    </div>
  )
}
