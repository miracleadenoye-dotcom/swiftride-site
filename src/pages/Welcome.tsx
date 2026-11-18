import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/ui'

export default function Welcome() {
  const nav = useNavigate()
  const pick = (role: 'customer' | 'rider') => { localStorage.setItem('sm_role_hint', role); nav('/signup') }
  return (
    <main className="flex min-h-full flex-col items-center justify-between bg-navy-900 px-6 py-12 text-white">
      <div />
      <section className="flex w-full max-w-md flex-col items-center text-center">
        <Logo size={88} />
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight">Swift Movement</h1>
        <p className="mt-2 text-xl font-semibold text-go-100">Your Ride, Your Way.</p>
        <p className="mt-1 text-slate-300">Ride smarter. Ride safer.</p>

        <div className="mt-10 w-full space-y-3">
          <p className="text-sm text-slate-300">I want to join as</p>
          <button className="btn-go w-full" onClick={() => pick('customer')}>Get Started as Customer</button>
          <button className="btn w-full border-2 border-white text-white" onClick={() => pick('rider')}>Get Started as Rider</button>
          <Link to="/login" className="block pt-2 text-sm text-slate-300 underline">I already have an account</Link>
        </div>
      </section>
      <Link to="/staff/login" className="text-xs text-slate-500">Staff</Link>
    </main>
  )
}
