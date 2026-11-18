import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Spinner } from '../components/ui'

interface N { id: string; title: string; body: string | null; read: boolean; created_at: string }

/** Shared notification center (customer + rider), with realtime delivery. */
export default function Notifications() {
  const { session } = useAuth()
  const uid = session!.user.id
  const [list, setList] = useState<N[] | null>(null)

  const load = async () => {
    const { data } = await supabase.from('notifications').select('id, title, body, read, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(100)
    setList((data as N[]) ?? [])
  }
  useEffect(() => {
    void load()
    const ch = supabase.channel('notif-page').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, () => void load()).subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [uid])

  async function markAll() { await supabase.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false); void load() }

  if (!list) return <Spinner />
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">Notifications</h1>
        {list.some(n => !n.read) && <button className="text-sm font-semibold underline" onClick={markAll}>Mark all read</button>}</div>
      {list.length === 0 && <p className="card text-slate-500">Nothing yet.</p>}
      {list.map(n => (
        <div key={n.id} className={`card ${n.read ? '' : 'border-l-4 border-l-go-500'}`}>
          <p className="font-bold">{n.title}</p>{n.body && <p className="text-sm text-slate-600">{n.body}</p>}
          <p className="mt-1 text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}
