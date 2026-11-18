import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useSignedUrl } from '../../lib/photos'
import { ErrorBox, Spinner } from '../../components/ui'

interface R { id: string; verification_status: string; plate_number: string | null; photo_paths: Record<string, string> | null; vehicle_grades: { name: string; vehicle_categories: { name: string } | null } | null; profiles: { full_name: string; phone: string } | null }

const Img = ({ path, label }: { path?: string; label: string }) => {
  const url = useSignedUrl(path)
  return <figure><div className="aspect-square overflow-hidden rounded-xl bg-slate-100">{url && <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={label} className="h-full w-full object-cover" /></a>}</div><figcaption className="mt-1 text-center text-xs text-slate-500">{label}</figcaption></figure>
}

export default function Verification() {
  const [rows, setRows] = useState<R[] | null>(null)
  const [filter, setFilter] = useState('pending')
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    const { data, error } = await supabase.from('riders')
      .select('id, verification_status, plate_number, photo_paths, vehicle_grades(name, vehicle_categories(name)), profiles(full_name, phone)')
      .eq('verification_status', filter).not('plate_number', 'is', null)
    if (error) setErr(error.message); setRows((data as unknown as R[]) ?? [])
  }
  useEffect(() => { setRows(null); void load() }, [filter])

  async function review(id: string, status: 'approved' | 'rejected') {
    const { error } = await supabase.rpc('admin_review_rider', { p_rider: id, p_status: status })
    if (error) setErr(error.message); else void load()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Rider verification</h1>
      <div className="flex gap-2">{['pending', 'approved', 'rejected'].map(f => <button key={f} onClick={() => setFilter(f)} className={`btn capitalize ${filter === f ? 'bg-navy-900 text-white' : 'border-2 border-slate-300 bg-white'}`}>{f}</button>)}</div>
      <ErrorBox msg={err} />
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="card text-slate-500">Nobody here.</p> : rows.map(r => (
        <div key={r.id} className="card space-y-3">
          <div className="flex flex-wrap justify-between gap-2">
            <div><p className="font-bold">{r.profiles?.full_name}</p><p className="text-sm text-slate-500">{r.profiles?.phone} · {r.vehicle_grades?.vehicle_categories?.name} {r.vehicle_grades?.name} · {r.plate_number}</p></div>
            {filter !== 'approved' && <button className="btn-go" onClick={() => review(r.id, 'approved')}>Approve</button>}
            {filter !== 'rejected' && <button className="btn-ghost" onClick={() => review(r.id, 'rejected')}>Reject</button>}
          </div>
          <div className="grid max-w-md grid-cols-3 gap-2">
            <Img path={r.photo_paths?.profile} label="Rider" /><Img path={r.photo_paths?.vehicle} label="Vehicle" /><Img path={r.photo_paths?.id} label="ID" />
          </div>
        </div>
      ))}
    </div>
  )
}
