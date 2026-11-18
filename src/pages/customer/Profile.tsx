import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useSignedUrl, uploadPhoto } from '../../lib/photos'
import { ErrorBox, Field, Spinner } from '../../components/ui'

export default function Profile() {
  const { session, signOut } = useAuth()
  const uid = session!.user.id
  const [p, setP] = useState<{ full_name: string; phone: string; price_padi_name: string; avatar_path: string | null } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const photo = useSignedUrl(p?.avatar_path)

  useEffect(() => { supabase.from('profiles').select('full_name, phone, price_padi_name, avatar_path').eq('id', uid).maybeSingle().then(({ data }) => setP(data as typeof p)) }, [uid])
  if (!p) return <Spinner />

  async function save() {
    setErr(null); setMsg(null)
    if (p!.full_name.trim().length < 3) return setErr('Enter your full name')
    if ((p!.price_padi_name ?? '').trim().length < 2) return setErr('Name your Price Padi')
    const { error } = await supabase.from('profiles').update({ full_name: p!.full_name.trim(), phone: p!.phone, price_padi_name: p!.price_padi_name.trim() }).eq('id', uid)
    error ? setErr(error.message) : setMsg('Saved')
  }
  async function newPhoto(f?: File) {
    if (!f) return
    try { const path = await uploadPhoto(uid, f, 'profile'); await supabase.from('profiles').update({ avatar_path: path }).eq('id', uid); setP({ ...p!, avatar_path: path }) }
    catch (x) { setErr((x as Error).message) }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-extrabold">Profile</h1>
      {photo && <img src={photo} alt="You" className="h-24 w-24 rounded-full object-cover" />}
      <Field label="Change photo"><input className="field" type="file" accept="image/*" onChange={e => void newPhoto(e.target.files?.[0])} /></Field>
      <Field label="Full name"><input className="field" value={p.full_name ?? ''} onChange={e => setP({ ...p, full_name: e.target.value })} /></Field>
      <Field label="Phone"><input className="field" value={p.phone ?? ''} onChange={e => setP({ ...p, phone: e.target.value })} /></Field>
      <Field label="Price Padi name"><input className="field" value={p.price_padi_name ?? ''} maxLength={30} onChange={e => setP({ ...p, price_padi_name: e.target.value })} /></Field>
      {msg && <p className="font-semibold text-go-600">{msg}</p>}
      <ErrorBox msg={err} />
      <button className="btn-go w-full" onClick={save}>Save</button>
      <button className="btn-ghost w-full" onClick={signOut}>Log out</button>
    </div>
  )
}
