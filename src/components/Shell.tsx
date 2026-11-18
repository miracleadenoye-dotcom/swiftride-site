import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Logo } from './ui'

export interface NavItem { to: string; label: string; icon: string }

/** One layout used by each of the three separate views. Phone: bottom bar. Desktop: side bar. */
export default function Shell({ title, items }: { title: string; items: NavItem[] }) {
  const { signOut } = useAuth()
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-go-500 text-white' : 'text-slate-200 hover:bg-navy-700'}`
  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col gap-1 bg-navy-900 p-4 md:flex">
        <div className="mb-4 flex items-center gap-2 text-white"><Logo size={36} /><span className="font-extrabold">{title}</span></div>
        {items.map(i => <NavLink key={i.to} to={i.to} end className={link}><span>{i.icon}</span>{i.label}</NavLink>)}
        <button onClick={signOut} className="mt-auto rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-300 hover:bg-navy-700">Log out</button>
      </aside>
      <header className="flex items-center justify-between bg-navy-900 px-4 py-3 text-white md:hidden">
        <span className="flex items-center gap-2 font-extrabold"><Logo size={28} />{title}</span>
        <button onClick={signOut} className="text-sm text-slate-300">Log out</button>
      </header>
      <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8"><div className="mx-auto max-w-5xl"><Outlet /></div></main>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {items.slice(0, 5).map(i => (
          <NavLink key={i.to} to={i.to} end className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-go-600' : 'text-slate-500'}`}>
            <span className="text-xl">{i.icon}</span>{i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
