import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ErrorBox, Spinner } from '../../components/ui'

interface T { id: string; user_id: string; subject: string; message: string; status: string; reply: string | null; created_at: string; profiles: { full_name: string } | null }

export default function Tickets() {
  const [list, setList] = useState<T[] | null>(null)
  const [filter, setFilter] = useState('open')
  const [reply, setReply] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)
  const load = () => supabase.from('support_tickets').select('id, user_id, subject, message, status, reply, created_at, profiles(full_name)').eq('status', filter).order('created_at').then(({ data, error }) => { if (error) setErr(error.message); setList((data as unknown as T[]) ?? []) })
  useEffect(() => { setList(null); void load() }, [filter])

  async function resolve(t: T) {
    const r = (reply[t.id] ?? '').trim()
    if (r.length < 2) return setErr('Write a reply first')
    const { error } = await supabase.from('support_tickets').update({ reply: r, status: 'resolved' }).eq('id', t.id)
    if (error) return setErr(error.message)
    await supabase.from('notifications').insert({ user_id: t.user_id, title: 'Support replied', body: r.slice(0, 140) })
    void load()
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Support tickets</h1>
      <div className="flex gap-2">{['open', 'resolved'].map(f => <button key={f} onClick={() => setFilter(f)} className={`btn capitalize ${filter === f ? 'bg-navy-900 text-white' : 'border-2 border-slate-300 bg-white'}`}>{f}</button>)}</div>
      <ErrorBox msg={err} />
      {!list ? <Spinner /> : list.length === 0 ? <p className="card text-slate-500">No tickets.</p> : list.map(t => (
        <div key={t.id} className="card space-y-2">
          <p className="font-bold">{t.subject} <span className="text-sm font-normal text-slate-500">· {t.profiles?.full_name}</span></p>
          <p className="text-sm">{t.message}</p>
          {t.status === 'open' ? (<>
            <textarea className="field" rows={2} placeholder="Reply" value={reply[t.id] ?? ''} onChange={e => setReply({ ...reply, [t.id]: e.target.value })} />
            <button className="btn-go" onClick={() => resolve(t)}>Reply & resolve</button></>) : <p className="rounded-xl bg-go-100 p-3 text-sm"><b>Reply:</b> {t.reply}</p>}
        </div>
      ))}
    </div>
  )
}
