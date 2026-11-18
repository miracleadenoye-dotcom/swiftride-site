import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { naira } from '../../lib/db'
import { ErrorBox, Field, Spinner } from '../../components/ui'

interface Tx { id: string; kind: string; amount: number; note: string | null; created_at: string }

export default function Wallet() {
  const { session } = useAuth()
  const uid = session!.user.id
  const [bal, setBal] = useState<number | null>(null)
  const [tx, setTx] = useState<Tx[]>([])
  const [amt, setAmt] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const [w, t] = await Promise.all([
      supabase.from('wallets').select('balance').eq('user_id', uid).maybeSingle(),
      supabase.from('wallet_transactions').select('id, kind, amount, note, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(50),
    ])
    setBal(Number(w.data?.balance ?? 0)); setTx((t.data as Tx[]) ?? [])
  }
  useEffect(() => { void load() }, [])

  async function fund() {
    setErr(null)
    const n = Number(amt)
    if (!(n >= 100 && n <= 500000)) return setErr('Enter an amount between ₦100 and ₦500,000')
    setBusy(true)
    // Internal ledger today. To use Paystack/Flutterwave later: take payment, verify the webhook server-side, then credit.
    const { error } = await supabase.rpc('wallet_fund', { p_amount: n, p_ref: 'internal-' + Date.now() })
    setBusy(false)
    if (error) return setErr(error.message)
    setAmt(''); void load()
  }

  if (bal === null) return <Spinner />
  const code = uid.replace(/-/g, '').slice(0, 8).toUpperCase()
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold">Wallet</h1>
      <div className="rounded-2xl bg-navy-900 p-5 text-white"><p className="text-sm text-slate-300">Balance</p><p className="text-4xl font-extrabold">{naira(bal)}</p></div>
      <div className="card space-y-3">
        <Field label="Fund wallet (₦)"><input className="field" inputMode="numeric" value={amt} onChange={e => setAmt(e.target.value.replace(/\D/g, ''))} /></Field>
        <ErrorBox msg={err} />
        <button className="btn-go w-full" disabled={busy} onClick={fund}>Add money</button>
        <p className="text-xs text-slate-500">Testing ledger. Card payments (Paystack / Flutterwave) plug in here later.</p>
      </div>
      <div className="card flex flex-col items-center gap-2">
        <p className="font-bold">Your payment QR</p>
        <QRCodeSVG value={uid} size={168} />
        <p className="text-sm text-slate-500">Your rider scans this, or types your code:</p>
        <p className="text-2xl font-extrabold tracking-widest">{code}</p>
      </div>
      <h2 className="font-bold">History</h2>
      {tx.length === 0 && <p className="card text-slate-500">No transactions yet.</p>}
      {tx.map(t => (
        <div key={t.id} className="card flex justify-between">
          <span><span className="capitalize">{t.kind.replace('_', ' ')}</span><br /><span className="text-xs text-slate-400">{new Date(t.created_at).toLocaleString()}</span></span>
          <b className={Number(t.amount) < 0 ? 'text-red-600' : 'text-go-600'}>{naira(Number(t.amount))}</b>
        </div>
      ))}
    </div>
  )
}
