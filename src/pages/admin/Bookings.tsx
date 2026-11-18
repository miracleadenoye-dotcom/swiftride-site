import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { naira } from '../../lib/db'
import { ErrorBox, Spinner } from '../../components/ui'

interface B { id: string; pickup_name: string; dest_name: string; fare: number; final_price: number | null; offered_price: number | null; status: string; created_at: string }

export default function Bookings() {
  const [rows, setRows] = useState<B[] | null>(null)
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    setRows(null)
    let query = supabase.from('rides').select('id, pickup_name, dest_name, fare, final_price, offered_price, status, created_at').order('created_at', { ascending: false }).limit(300)
    if (status !== 'all') query = query.eq('status', status)
    query.then(({ data, error }) => { if (error) setErr(error.message); setRows((data as B[]) ?? []) })
  }, [status])
  if (!rows) return <Spinner />
  const list = rows.filter(r => `${r.pickup_name} ${r.dest_name}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Bookings</h1>
      <ErrorBox msg={err} />
      <div className="flex flex-wrap gap-2">
        <input className="field max-w-xs" placeholder="Search place" value={q} onChange={e => setQ(e.target.value)} />
        <select className="field max-w-[12rem]" value={status} onChange={e => setStatus(e.target.value)}>
          {['all', 'pending', 'accepted', 'ongoing', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">When</th><th>From</th><th>To</th><th>Fare</th><th>Price</th><th>Status</th></tr></thead>
          <tbody>{list.map(r => (
            <tr key={r.id} className="border-t border-slate-100"><td className="p-3">{new Date(r.created_at).toLocaleString()}</td><td>{r.pickup_name}</td><td>{r.dest_name}</td><td>{naira(r.fare)}</td><td>{naira(r.final_price ?? r.offered_price ?? r.fare)}</td><td className="capitalize">{r.status}</td></tr>
          ))}</tbody>
        </table>
        {list.length === 0 && <p className="p-4 text-slate-500">No bookings.</p>}
      </div>
    </div>
  )
}
