import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { Logo } from './ui'
import EntryAdvert from './EntryAdvert'

export interface NavItem { to: string; label: string; icon: string }

function Bell({ to }: { to: string }) {
  const { session } = useAuth()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!session) return
    const uid = session.user.id
    const count = () => supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false).then(({ count }) => setN(count ?? 0))
    void count()
    const ch = supabase.channel('bell').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, () => void count()).subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [session])
  return (
    <Link to={to} aria-label="Notifications" className="relative text-xl">
      🔔{n > 0 && <span className="absolute -right-2 -top-1 rounded-full bg-go-500 px-1.5 text-[10px] font-bold text-white">{n > 9 ? '9+' : n}</span>}
    </Link>
  )
}

/** One layout used by each of the three separate views. Phone: bottom bar. Desktop: side bar. */
export default function Shell({ title, items, notifPath }: { title: string; items: NavItem[]; notifPath?: string }) {
  const { signOut } = useAuth()
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-go-500 text-white' : 'text-slate-200 hover:bg-navy-700'}`
  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <EntryAdvert />
      <aside className="hidden w-60 shrink-0 flex-col gap-1 bg-navy-900 p-4 md:flex">
        <div className="mb-4 flex items-center justify-between text-white">
          <span className="flex items-center gap-2"><Logo size={36} /><span className="font-extrabold">{title}</span></span>
          {notifPath && <Bell to={notifPath} />}
        </div>
        {items.map(i => <NavLink key={i.to} to={i.to} end className={link}><span>{i.icon}</span>{i.label}</NavLink>)}
        <button onClick={signOut} className="mt-auto rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-300 hover:bg-navy-700">Log out</button>
      </aside>
      <header className="flex items-center justify-between bg-navy-900 px-4 py-3 text-white md:hidden">
        <span className="flex items-center gap-2 font-extrabold"><Logo size={28} />{title}</span>
        <span className="flex items-center gap-4">{notifPath && <Bell to={notifPath} />}<button onClick={signOut} className="text-sm text-slate-300">Log out</button></span>
      </header>
      <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8"><div className="mx-auto max-w-5xl"><Outlet /></div></main>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t border-slate-200 bg-white md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {items.map(i => (
          <NavLink key={i.to} to={i.to} end className={({ isActive }) => `flex min-w-[4.5rem] flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-go-600' : 'text-slate-500'}`}>
            <span className="text-xl">{i.icon}</span>{i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
