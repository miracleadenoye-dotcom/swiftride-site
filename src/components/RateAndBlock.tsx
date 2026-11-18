import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ErrorBox } from './ui'

/** After a completed trip: rate the other person (1-5), and optionally block them. */
export default function RateAndBlock({ rideId, otherId, otherLabel }: { rideId: string; otherId: string | null; otherLabel: string }) {
  const { session } = useAuth()
  const uid = session!.user.id
  const [done, setDone] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [blocked, setBlocked] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { supabase.from('ratings').select('id').eq('ride_id', rideId).eq('rater_id', uid).maybeSingle().then(({ data }) => setDone(!!data)) }, [rideId, uid])
  if (!otherId || done === null) return null

  async function submit() {
    setErr(null)
    if (score < 1) return setErr('Tap a star rating')
    const { error } = await supabase.from('ratings').insert({ ride_id: rideId, rater_id: uid, ratee_id: otherId, score, comment: comment.trim().slice(0, 300) || null })
    if (error) return setErr(error.message); setDone(true)
  }
  async function block() {
    if (!confirm(`Block this ${otherLabel}? You will not be matched again.`)) return
    const { error } = await supabase.from('blocks').upsert({ blocker_id: uid, blocked_id: otherId })
    if (error) setErr(error.message); else setBlocked(true)
  }
  return (
    <div className="card space-y-3">
      {done ? <p className="font-semibold text-go-600">Thanks for rating your {otherLabel}.</p> : (<>
        <p className="font-bold">Rate your {otherLabel}</p>
        <div className="flex gap-1" role="radiogroup">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-label={`${n} stars`} className={`text-3xl ${n <= score ? 'text-navy-900' : 'text-slate-300'}`} onClick={() => setScore(n)}>★</button>)}</div>
        <input className="field" placeholder="Comment (optional)" maxLength={300} value={comment} onChange={e => setComment(e.target.value)} />
        <button className="btn-go w-full" onClick={submit}>Submit rating</button></>)}
      <ErrorBox msg={err} />
      <button className="text-sm font-semibold text-red-600 underline" disabled={blocked} onClick={block}>{blocked ? `${otherLabel} blocked` : `Block this ${otherLabel}`}</button>
    </div>
  )
}
