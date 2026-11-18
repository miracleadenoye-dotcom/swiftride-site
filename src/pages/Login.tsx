import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ErrorBox, Field } from '../components/ui'

/** Shared by customer/rider login and the restricted staff login.
 *  Step 1: password check. Step 2: email OTP (required on EVERY login).
 *  Step 3 (staff only): server-verified staff PIN. */
export default function Login({ staff = false }: { staff?: boolean }) {
  const nav = useNavigate()
  const loc = useLocation() as { state?: { email?: string; notice?: string } }
  const [step, setStep] = useState<'pw' | 'otp' | 'pin'>('pw')
  const [email, setEmail] = useState(loc.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function wrap(fn: () => Promise<string | null>) {
    setErr(null); setBusy(true)
    const e = await fn().catch(x => String(x?.message ?? x))
    setBusy(false); if (e) setErr(e)
  }

  const checkPassword = (e: React.FormEvent) => { e.preventDefault(); void wrap(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return 'Wrong email or password'
    // Password is verified; drop this session so access is only granted after the OTP.
    await supabase.auth.signOut()
    const { error: oe } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } })
    if (oe) return oe.message
    setStep('otp'); return null
  }) }

  const checkOtp = (e: React.FormEvent) => { e.preventDefault(); void wrap(async () => {
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    if (error) return 'Invalid or expired code'
    if (staff) {
      const { data } = await supabase.rpc('my_role')
      if (!String(data ?? '').startsWith('staff:')) {
        await supabase.auth.signOut(); return 'This account is not authorised for staff access'
      }
      setStep('pin'); return null
    }
    nav('/app', { replace: true }); return null
  }) }

  const checkPin = (e: React.FormEvent) => { e.preventDefault(); void wrap(async () => {
    const { data, error } = await supabase.rpc('verify_staff_pin', { p_pin: pin })
    if (error || !data) { await supabase.auth.signOut(); setStep('pw'); return 'Staff confirmation failed. Log in again.' }
    sessionStorage.setItem('sm_staff_ok', '1')
    nav('/admin', { replace: true }); return null
  }) }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 px-5 py-8">
      <h1 className="text-3xl font-extrabold">{staff ? 'Staff login' : 'Welcome back'}</h1>
      {loc.state?.notice && <p className="rounded-xl bg-go-100 px-4 py-3 text-sm text-go-600">{loc.state.notice}</p>}

      {step === 'pw' && (
        <form onSubmit={checkPassword} className="space-y-4">
          <Field label="Email"><input className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></Field>
          <Field label="Password"><input className="field" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></Field>
          <ErrorBox msg={err} />
          <button className="btn-go w-full" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
          {!staff && <Link to="/recover" className="block text-center text-sm underline">Forgot password?</Link>}
        </form>
      )}
      {step === 'otp' && (
        <form onSubmit={checkOtp} className="space-y-4">
          <p className="text-sm text-slate-600">We sent a code to <b>{email}</b>.</p>
          <Field label="Verification code"><input className="field text-center text-2xl tracking-widest" inputMode="numeric" maxLength={8} value={code} onChange={e => setCode(e.target.value)} autoFocus /></Field>
          <ErrorBox msg={err} />
          <button className="btn-go w-full" disabled={busy}>{busy ? 'Verifying…' : 'Verify & log in'}</button>
        </form>
      )}
      {step === 'pin' && (
        <form onSubmit={checkPin} className="space-y-4">
          <p className="text-sm text-slate-600">Enter your staff confirmation PIN.</p>
          <Field label="Staff PIN"><input className="field text-center text-2xl tracking-widest" type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} autoFocus /></Field>
          <ErrorBox msg={err} />
          <button className="btn-navy w-full" disabled={busy}>Confirm</button>
        </form>
      )}
      {!staff && <p className="text-center text-sm">New here? <Link to="/signup" className="font-semibold underline">Create account</Link></p>}
    </main>
  )
}
