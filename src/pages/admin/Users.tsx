import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ErrorBox, Spinner } from '../../components/ui'

interface P { id: string; full_name: string; phone: string; email: string; account_status: string }

export default function Users() {
  const [rows, setRows] = useState<(P & { role?: string })[] | null>(null)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'customer' | 'rider'>('all')
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    const [{ data: p, error }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone, email, account_status').order('full_name').limit(500),
      supabase.from('user_roles').select('user_id, role'),
    ])
    if (error) return setErr(error.message)
    const roles = Object.fromEntries((r ?? []).map(x => [x.user_id, x.role]))
    setRows(((p as P[]) ?? []).map(x => ({ ...x, role: roles[x.id] })).filter(x => x.role))
  }
  useEffect(() => { void load() }, [])

  async function setStatus(id: string, status: string) {
    if (!confirm(status === 'suspended' ? 'Suspend this account?' : 'Restore this account?')) return
    const { error } = await supabase.rpc('admin_set_account_status', { p_user: id, p_status: status })
    if (error) setErr(error.message); else void load()
  }

  if (!rows) return err ? <ErrorBox msg={err} /> : <Spinner />
  const list = rows.filter(r => (tab === 'all' || r.role === tab) && `${r.full_name} ${r.email} ${r.phone}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Users</h1>
      <ErrorBox msg={err} />
      <div className="flex flex-wrap gap-2">
        <input className="field max-w-xs" placeholder="Search name, email, phone" value={q} onChange={e => setQ(e.target.value)} />
        {(['all', 'customer', 'rider'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`btn capitalize ${tab === t ? 'bg-navy-900 text-white' : 'border-2 border-slate-300 bg-white'}`}>{t}</button>)}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">Name</th><th>Role</th><th>Phone</th><th>Email</th><th>Status</th><th /></tr></thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="p-3 font-semibold">{u.full_name}</td><td className="capitalize">{u.role}</td><td>{u.phone}</td><td>{u.email}</td>
                <td><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${u.account_status === 'active' ? 'bg-go-100 text-go-600' : 'bg-red-100 text-red-700'}`}>{u.account_status}</span></td>
                <td className="p-2 text-right">
                  {u.account_status === 'active'
                    ? <button className="btn-ghost !min-h-0 !py-1.5 text-xs" onClick={() => setStatus(u.id, 'suspended')}>Suspend</button>
                    : <button className="btn-go !min-h-0 !py-1.5 text-xs" onClick={() => setStatus(u.id, 'active')}>Restore</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="p-4 text-slate-500">No users found.</p>}
      </div>
    </div>
  )
}
