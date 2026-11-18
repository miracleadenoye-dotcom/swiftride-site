import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { naira } from '../../lib/db'
import { ErrorBox, Field, Spinner } from '../../components/ui'

function periodStart(p: 'weekly' | 'monthly') {
  const d = new Date()
  if (p === 'weekly') { const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day) } else d.setDate(1)
  d.setHours(0, 0, 0, 0); return d
}

export default function Budget() {
  const { session } = useAuth()
  const uid = session!.user.id
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly')
  const [amount, setAmount] = useState('')
  const [spent, setSpent] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const spend = async (p: 'weekly' | 'monthly') => {
    const { data } = await supabase.rpc('my_spend', { p_since: periodStart(p).toISOString() })
    setSpent(Number(data ?? 0))
  }
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('budgets').select('period, amount').eq('user_id', uid).maybeSingle()
      const p = (data?.period as 'weekly' | 'monthly') ?? 'monthly'
      setPeriod(p); setAmount(data ? String(data.amount) : ''); await spend(p); setLoaded(true)
    })()
  }, [uid])

  async function save() {
    setErr(null)
    const n = Number(amount)
    if (!(n > 0 && n <= 10_000_000)) return setErr('Enter a budget amount')
    const { error } = await supabase.from('budgets').upsert({ user_id: uid, period, amount: n })
    if (error) return setErr(error.message)
    void spend(period)
  }

  if (!loaded) return <Spinner />
  const budget = Number(amount) || 0
  const pct = budget ? Math.min(100, Math.round((spent / budget) * 100)) : 0
  const state = pct >= 100 ? 'over' : pct >= 80 ? 'near' : 'ok'
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-extrabold">Transport budget</h1>
      <div className="grid grid-cols-2 gap-2">
        {(['weekly', 'monthly'] as const).map(p => <button key={p} className={`btn capitalize ${period === p ? 'bg-navy-900 text-white' : 'border-2 border-slate-300 bg-white'}`} onClick={() => { setPeriod(p); void spend(p) }}>{p}</button>)}
      </div>
      <Field label={`${period} budget (₦)`}><input className="field" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} /></Field>
      <ErrorBox msg={err} />
      <button className="btn-go w-full" onClick={save}>Save budget</button>
      {budget > 0 && (
        <div className="card space-y-2">
          <div className="flex justify-between text-sm"><span>Spent {naira(spent)}</span><span>of {naira(budget)}</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className={`h-full ${state === 'ok' ? 'bg-go-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} /></div>
          {state === 'near' && <p className="font-semibold text-red-600">Careful, you are close to your limit.</p>}
          {state === 'over' && <p className="font-semibold text-red-600">You have passed your {period} budget.</p>}
        </div>
      )}
    </div>
  )
}
