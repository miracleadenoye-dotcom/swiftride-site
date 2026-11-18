import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { uploadPhoto, useSignedUrl } from '../../lib/photos'
import { ErrorBox, Field, Spinner } from '../../components/ui'

export default function RiderProfile() {
  const { session, signOut } = useAuth()
  const uid = session!.user.id
  const [plate, setPlate] = useState('')
  const [status, setStatus] = useState('')
  const [paths, setPaths] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const vehicle = useSignedUrl(paths.vehicle)

  useEffect(() => {
    supabase.from('riders').select('plate_number, verification_status, photo_paths').eq('id', uid).maybeSingle()
      .then(({ data }) => { setPlate(data?.plate_number ?? ''); setStatus(data?.verification_status ?? ''); setPaths(data?.photo_paths ?? {}); setLoaded(true) })
  }, [uid])
  if (!loaded) return <Spinner />

  async function save() {
    setErr(null); setMsg(null)
    const p = plate.trim().toUpperCase()
    if (!/^[A-Z0-9 -]{5,12}$/.test(p)) return setErr('Enter a valid plate number')
    const { error } = await supabase.from('riders').update({ plate_number: p }).eq('id', uid)
    error ? setErr(error.message) : setMsg('Saved')
  }
  async function swap(kind: 'vehicle' | 'profile', f?: File) {
    if (!f) return
    try {
      const path = await uploadPhoto(uid, f, kind); const next = { ...paths, [kind]: path }
      const { error } = await supabase.from('riders').update({ photo_paths: next }).eq('id', uid)
      if (error) throw error; setPaths(next)
    } catch (x) { setErr((x as Error).message) }
  }
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-extrabold">Vehicle & profile</h1>
      <p className="text-sm">Verification: <b className="capitalize">{status}</b></p>
      {vehicle && <img src={vehicle} alt="Vehicle" className="h-40 w-full rounded-2xl object-cover" />}
      <Field label="Change vehicle photo"><input className="field" type="file" accept="image/*" onChange={e => void swap('vehicle', e.target.files?.[0])} /></Field>
      <Field label="Change profile photo"><input className="field" type="file" accept="image/*" onChange={e => void swap('profile', e.target.files?.[0])} /></Field>
      <Field label="Plate number"><input className="field" value={plate} onChange={e => setPlate(e.target.value)} /></Field>
      {msg && <p className="font-semibold text-go-600">{msg}</p>}
      <ErrorBox msg={err} />
      <div className="grid grid-cols-3 gap-2">
        <Link to="/rider/safety" className="btn-ghost">🛡️ Safety</Link>
        <Link to="/rider/support" className="btn-ghost">💬 Support</Link>
        <Link to="/rider/notifications" className="btn-ghost">🔔 Alerts</Link>
      </div>
      <button className="btn-go w-full" onClick={save}>Save</button>
      <button className="btn-ghost w-full" onClick={signOut}>Log out</button>
    </div>
  )
}
