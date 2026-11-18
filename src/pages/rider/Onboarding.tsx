import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { uploadPhoto } from '../../lib/photos'
import { ErrorBox, Field, Spinner } from '../../components/ui'

interface Grade { id: string; name: string; vehicle_categories: { name: string } | null }

/** Rider sign-up step 2: multiple photos (profile, vehicle, ID) + vehicle details. */
export default function Onboarding() {
  const { session } = useAuth()
  const nav = useNavigate()
  const uid = session!.user.id
  const [grades, setGrades] = useState<Grade[] | null>(null)
  const [gradeId, setGradeId] = useState('')
  const [plate, setPlate] = useState('')
  const [files, setFiles] = useState<{ profile?: File; vehicle?: File; id?: File }>({})
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('vehicle_grades').select('id, name, vehicle_categories(name)').eq('active', true)
      .then(({ data }) => { setGrades((data as unknown as Grade[]) ?? []); if (data?.[0]) setGradeId(data[0].id) })
  }, [])
  if (!grades) return <Spinner />

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    const p = plate.trim().toUpperCase()
    if (!/^[A-Z0-9 -]{5,12}$/.test(p)) return setErr('Enter a valid plate number')
    if (!files.profile || !files.vehicle || !files.id) return setErr('Please add all three photos')
    setBusy(true)
    try {
      const [profile, vehicle, idc] = await Promise.all([
        uploadPhoto(uid, files.profile, 'profile'), uploadPhoto(uid, files.vehicle, 'vehicle'), uploadPhoto(uid, files.id, 'id')])
      const { error } = await supabase.from('riders').update({ vehicle_grade_id: gradeId, plate_number: p, photo_paths: { profile, vehicle, id: idc } }).eq('id', uid)
      if (error) throw error
      await supabase.from('profiles').update({ avatar_path: profile }).eq('id', uid)
      nav('/rider', { replace: true })
    } catch (x) { setErr((x as Error).message) }
    setBusy(false)
  }
  const pick = (k: 'profile' | 'vehicle' | 'id') => (e: React.ChangeEvent<HTMLInputElement>) => setFiles({ ...files, [k]: e.target.files?.[0] })

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-extrabold">Rider details</h1>
      <p className="text-sm text-slate-500">Our team reviews these before you can receive rides.</p>
      <Field label="Vehicle type & grade">
        <select className="field" value={gradeId} onChange={e => setGradeId(e.target.value)}>
          {grades.map(g => <option key={g.id} value={g.id}>{g.vehicle_categories?.name} · {g.name}</option>)}
        </select>
      </Field>
      <Field label="Plate number"><input className="field" value={plate} onChange={e => setPlate(e.target.value)} placeholder="EKT 123 AB" /></Field>
      <Field label="Your photo"><input className="field" type="file" accept="image/*" onChange={pick('profile')} /></Field>
      <Field label="Vehicle photo"><input className="field" type="file" accept="image/*" onChange={pick('vehicle')} /></Field>
      <Field label="ID card photo"><input className="field" type="file" accept="image/*" onChange={pick('id')} /></Field>
      <ErrorBox msg={err} />
      <button className="btn-go w-full" disabled={busy}>{busy ? 'Uploading…' : 'Submit for verification'}</button>
    </form>
  )
}
