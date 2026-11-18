import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Spinner, ErrorBox } from '../../components/ui'

interface R { verification_status: string; is_online: boolean; plate_number: string | null; photo_paths: Record<string, string> | null }

export default function RiderHome() {
  const { session } = useAuth()
  const nav = useNavigate()
  const uid = session!.user.id
  const [r, setR] = useState<R | null>(null)
  const [name, setName] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const [{ data: d }, { data: p }, { data: a }] = await Promise.all([
        supabase.from('riders').select('verification_status, is_online, plate_number, photo_paths').eq('id', uid).maybeSingle(),
        supabase.from('profiles').select('full_name').eq('id', uid).maybeSingle(),
        supabase.from('rides').select('id').eq('rider_id', uid).in('status', ['accepted', 'ongoing']).limit(1),
      ])
      if (!d?.plate_number || !d?.photo_paths?.vehicle) { nav('/rider/onboarding', { replace: true }); return }
      setR(d as R); setName(p?.full_name?.split(' ')[0] ?? ''); setActive(a?.[0]?.id ?? null)
    })()
  }, [uid, nav])

  async function toggle() {
    setErr(null)
    const { error } = await supabase.from('riders').update({ is_online: !r!.is_online }).eq('id', uid)
    if (error) return setErr(error.message)
    setR({ ...r!, is_online: !r!.is_online })
  }

  if (!r) return <Spinner />
  const approved = r.verification_status === 'approved'
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold">Hi, {name || 'rider'} 👋</h1>
      {!approved && (
        <div className="card border-l-4 border-l-navy-600">
          <p className="font-bold capitalize">Verification: {r.verification_status}</p>
          <p className="text-sm text-slate-600">{r.verification_status === 'rejected' ? 'Your details were rejected. Update them in Profile and contact support.' : 'We are reviewing your documents. You cannot receive rides until you are approved.'}</p>
        </div>
      )}
      {active && <Link to={`/rider/trip/${active}`} className="btn-navy w-full">Continue active trip</Link>}
      <div className="card flex items-center justify-between">
        <div><p className="font-bold">{r.is_online ? 'You are online' : 'You are offline'}</p><p className="text-sm text-slate-500">{approved ? 'Go online to get requests' : 'Available after approval'}</p></div>
        <button disabled={!approved} onClick={toggle} className={`btn ${r.is_online ? 'bg-go-500 text-white' : 'border-2 border-slate-300 bg-white'}`}>{r.is_online ? 'Online' : 'Go online'}</button>
      </div>
      <ErrorBox msg={err} />
      {r.is_online && <Link to="/rider/requests" className="btn-go w-full">View ride requests</Link>}
    </div>
  )
}
