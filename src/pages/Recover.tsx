import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ErrorBox, Field } from '../components/ui'

/** Request reset email (route /recover) and set a new password after clicking the email link (same page, recovery session). */
export default function Recover() {
  const nav = useNavigate()
  const [recovering, setRecovering] = useState(false)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === 'PASSWORD_RECOVERY') setRecovering(true) })
    return () => data.subscription.unsubscribe()
  }, [])

  async function send(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/recover` })
    if (error) setErr(error.message); else setMsg('Check your email for the reset link.')
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (pw.length < 8) return setErr('Password must be at least 8 characters')
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) return setErr(error.message)
    await supabase.auth.signOut()
    nav('/login', { state: { notice: 'Password updated. Log in with your new password.' } })
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 px-5 py-8">
      <h1 className="text-3xl font-extrabold">Reset password</h1>
      {recovering ? (
        <form onSubmit={save} className="space-y-4">
          <Field label="New password"><input className="field" type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" /></Field>
          <ErrorBox msg={err} /><button className="btn-go w-full">Save password</button>
        </form>
      ) : (
        <form onSubmit={send} className="space-y-4">
          <Field label="Email"><input className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
          {msg && <p className="rounded-xl bg-go-100 px-4 py-3 text-sm text-go-600">{msg}</p>}
          <ErrorBox msg={err} /><button className="btn-go w-full">Send reset link</button>
        </form>
      )}
      <Link to="/login" className="text-center text-sm underline">Back to login</Link>
    </main>
  )
}
