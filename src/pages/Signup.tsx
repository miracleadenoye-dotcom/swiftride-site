import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { ErrorBox, Field } from '../components/ui'

const schema = z.object({
  fullName: z.string().trim().min(3, 'Enter your full name').max(80),
  phone: z.string().trim().regex(/^(\+234|0)[789]\d{9}$/, 'Enter a valid Nigerian phone number'),
  email: z.string().trim().email('Enter a valid email').max(120),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  role: z.enum(['customer', 'rider']),
})

export default function Signup() {
  const nav = useNavigate()
  const [role, setRole] = useState<'customer' | 'rider'>(localStorage.getItem('sm_role_hint') === 'rider' ? 'rider' : 'customer')
  const [f, setF] = useState({ fullName: '', phone: '', email: '', password: '' })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    const p = schema.safeParse({ ...f, role })
    if (!p.success) return setErr(p.error.issues[0].message)
    setBusy(true)
    const { error } = await supabase.auth.signUp({
      email: p.data.email, password: p.data.password,
      options: { data: { full_name: p.data.fullName, phone: p.data.phone, role: p.data.role } },
    })
    setBusy(false)
    if (error) return setErr(error.message)
    // Supabase may send a confirmation email. Either way, every login requires an OTP.
    await supabase.auth.signOut()
    nav('/login', { state: { email: p.data.email, notice: 'Account created. Log in to continue (check your email if asked to confirm).' } })
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 px-5 py-8">
      <h1 className="text-3xl font-extrabold">Create account</h1>
      <div className="grid grid-cols-2 gap-2">
        {(['customer', 'rider'] as const).map(r => (
          <button key={r} type="button" onClick={() => setRole(r)}
            className={`btn ${role === r ? 'bg-navy-900 text-white' : 'border-2 border-slate-300 bg-white'}`}>
            {r === 'customer' ? 'Customer' : 'Rider'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name"><input className="field" value={f.fullName} onChange={set('fullName')} autoComplete="name" /></Field>
        <Field label="Phone"><input className="field" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="08012345678" autoComplete="tel" /></Field>
        <Field label="Email (Gmail)"><input className="field" type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
        <Field label="Password"><input className="field" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
        <ErrorBox msg={err} />
        <button className="btn-go w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="text-center text-sm">Have an account? <Link to="/login" className="font-semibold underline">Log in</Link></p>
    </main>
  )
}
