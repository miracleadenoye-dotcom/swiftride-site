import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { naira } from '../../lib/db'
import { ErrorBox, Spinner } from '../../components/ui'

export default function Stats() {
  const [s, setS] = useState<Record<string, number | null> | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { supabase.rpc('admin_stats').then(({ data, error }) => error ? setErr(error.message) : setS(data)) }, [])
  if (err) return <ErrorBox msg={err} />
  if (!s) return <Spinner />
  const cards: [string, string][] = [
    ['Customers', String(s.customers)], ['Riders', String(s.riders)], ['Riders awaiting review', String(s.pending_riders)],
    ['Total rides', String(s.rides_total)], ['Pending', String(s.rides_pending)], ['Ongoing', String(s.rides_ongoing)],
    ['Completed', String(s.rides_completed)], ['Gross fares', naira(Number(s.gross))],
    ...(s.revenue != null ? [['Platform revenue', naira(Number(s.revenue))] as [string, string]] : []),
  ]
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Overview</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([l, v]) => <div key={l} className="card"><p className="text-xs text-slate-500">{l}</p><p className="text-2xl font-extrabold text-navy-900">{v}</p></div>)}
      </div>
    </div>
  )
}
