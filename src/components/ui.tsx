import type { ReactNode } from 'react'

export const Logo = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Swift Movement logo">
    <rect width="64" height="64" rx="14" fill="#fff" />
    <path d="M14 40l12-16h10l-6 9h14l-12 15H18z" fill="#16a34a" />
  </svg>
)

export const Spinner = () => (
  <div className="flex h-full min-h-[200px] items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-go-500" />
  </div>
)

export const ErrorBox = ({ msg }: { msg: string | null }) =>
  msg ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{msg}</p> : null

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block"><span className="label">{label}</span>{children}</label>
)
