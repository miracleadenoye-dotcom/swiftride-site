import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ErrorBox, Field, Spinner } from '../components/ui'

interface T { id: string; subject: string; message: string; status: string; reply: string | null; created_at: string }

export default function Support() {
  const { session } = useAuth()
  const uid = session!.user.id
  const [list, setList] = useState<T[] | null>(null)
  const [f, setF] = useState({ subject: '', message: '' })
  const [err, setErr] = useState<string | null>(null)
  const load = () => supabase.from('support_tickets').select('id, subject, message, status, reply, created_at').eq('user_id', uid).order('created_at', { ascending: false }).then(({ data }) => setList((data as T[]) ?? []))
  useEffect(() => { void load() }, [])

  async function send() {
    setErr(null)
    if (f.subject.trim().length < 3) return setErr('Add a subject')
    if (f.message.trim().length < 10) return setErr('Please describe the issue (at least 10 characters)')
    const { error } = await supabase.from('support_tickets').insert({ user_id: uid, subject: f.subject.trim().slice(0, 100), message: f.message.trim().slice(0, 1000) })
    if (error) return setErr(error.message); setF({ subject: '', message: '' }); void load()
  }
  if (!list) return <Spinner />
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold">Support</h1>
      <div className="card space-y-3">
        <Field label="Subject"><input className="field" value={f.subject} maxLength={100} onChange={e => setF({ ...f, subject: e.target.value })} /></Field>
        <Field label="What happened?"><textarea className="field" rows={4} maxLength={1000} value={f.message} onChange={e => setF({ ...f, message: e.target.value })} /></Field>
        <ErrorBox msg={err} />
        <button className="btn-go w-full" onClick={send}>Send to support</button>
      </div>
      {list.map(t => (
        <div key={t.id} className="card space-y-1">
          <div className="flex justify-between"><b>{t.subject}</b><span className={`text-xs font-bold uppercase ${t.status === 'open' ? 'text-slate-500' : 'text-go-600'}`}>{t.status}</span></div>
          <p className="text-sm text-slate-600">{t.message}</p>
          {t.reply && <p className="rounded-xl bg-go-100 p-3 text-sm"><b>Support:</b> {t.reply}</p>}
        </div>
      ))}
    </div>
  )
}
