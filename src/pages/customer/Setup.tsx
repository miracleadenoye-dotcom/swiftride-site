import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { uploadPhoto } from '../../lib/photos'
import { ErrorBox, Field } from '../../components/ui'

/** One-time setup: ONE profile photo, then name the Price Padi. */
export default function Setup() {
  const { session } = useAuth()
  const nav = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [padi, setPadi] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    const n = padi.trim()
    if (!file) return setErr('Please add a profile photo')
    if (n.length < 2 || n.length > 30) return setErr('Name your Price Padi (2 to 30 characters)')
    setBusy(true)
    try {
      const uid = session!.user.id
      const path = await uploadPhoto(uid, file, 'profile')
      const { error } = await supabase.from('profiles').update({ avatar_path: path, price_padi_name: n }).eq('id', uid)
      if (error) throw error
      nav('/customer', { replace: true })
    } catch (x) { setErr((x as Error).message) }
    setBusy(false)
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-md space-y-5">
      <h1 className="text-2xl font-extrabold">Set up your profile</h1>
      <Field label="Profile photo (one)">
        <input className="field" type="file" accept="image/*" capture="user" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      </Field>
      {file && <img src={URL.createObjectURL(file)} alt="Preview" className="h-28 w-28 rounded-full object-cover" />}
      <Field label="Name your Price Padi">
        <input className="field" value={padi} onChange={e => setPadi(e.target.value)} placeholder="e.g. Oga Calculator" maxLength={30} />
      </Field>
      <p className="text-sm text-slate-500">Your Price Padi advises you on fares. It never blocks a booking.</p>
      <ErrorBox msg={err} />
      <button className="btn-go w-full" disabled={busy}>{busy ? 'Saving…' : 'Continue'}</button>
    </form>
  )
}
