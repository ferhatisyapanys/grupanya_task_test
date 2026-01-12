"use client"
import { useState } from 'react'

type Role = 'ADMIN'|'MANAGER'|'TEAM_LEADER'|'SALESPERSON'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('SALESPERSON')
  const [devEmail, setDevEmail] = useState('dev@example.com')
  const [devUserId, setDevUserId] = useState('dev-user')
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setErr(null)
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
      const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
      const res = await f(`${base}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) })
      if (!res.ok) throw await res.json()
      const data = await res.json().catch(()=>null) || (await res.json())
      const d = (data as any)
      if (typeof window !== 'undefined') {
        if (d?.accessToken) window.localStorage.setItem('accessToken', d.accessToken)
        if (d?.refreshToken) window.localStorage.setItem('refreshToken', d.refreshToken)
        if (d?.user?.id) window.localStorage.setItem('userId', d.user.id)
        if (d?.user?.role) window.localStorage.setItem('userRole', d.user.role)
        if (email) window.localStorage.setItem('userEmail', email)
        redirectByRole((d?.user?.role as Role) || 'SALESPERSON')
      }
    } catch (e:any) {
      setErr(e?.error?.message || e.message || 'Giriş başarısız')
    }
  }

  function devQuickLogin() {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem('accessToken')
    window.localStorage.removeItem('refreshToken')
    window.localStorage.setItem('devUserId', devUserId || 'dev-user')
    window.localStorage.setItem('devUserEmail', devEmail || 'dev@example.com')
    window.localStorage.setItem('devRole', role)
    redirectByRole(role)
  }

  function redirectByRole(r: Role) {
    let href = '/'
    if (r === 'SALESPERSON') href = '/tasks/my'
    else if (r === 'TEAM_LEADER') href = '/tasks'
    else if (r === 'MANAGER') href = '/reports'
    else if (r === 'ADMIN') href = '/admin/categories'
    window.location.href = href
  }

  return (
    <div className="grid gap-6 max-w-md mx-auto mt-10">
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Giriş (Email/Şifre)</h2>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <label className="grid gap-1">
          <span className="text-xs text-slate-600">Email</span>
          <input className="border rounded-md px-3 py-2" value={email} onChange={(e)=>setEmail(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-slate-600">Şifre</span>
          <input type="password" className="border rounded-md px-3 py-2" value={password} onChange={(e)=>setPassword(e.target.value)} />
        </label>
        <button onClick={submit} className="border rounded-md px-3 py-2">Giriş</button>
      </section>

      <section className="grid gap-3 border-t pt-4">
        <h3 className="font-semibold">Hızlı Giriş (Dev)</h3>
        <div className="flex gap-2 items-center">
          <select value={role} onChange={(e)=> setRole(e.target.value as Role)} className="border rounded-md px-3 py-2">
            {['ADMIN','MANAGER','TEAM_LEADER','SALESPERSON'].map(r=> <option key={r} value={r}>{r}</option>)}
          </select>
          <input placeholder="User ID" value={devUserId} onChange={(e)=> setDevUserId(e.target.value)} className="border rounded-md px-3 py-2" />
          <input placeholder="Email" value={devEmail} onChange={(e)=> setDevEmail(e.target.value)} className="border rounded-md px-3 py-2" />
          <button onClick={devQuickLogin} className="border rounded-md px-3 py-2">Giriş</button>
        </div>
        <p className="text-xs text-slate-500">Bu seçenek, development ortamında header üzerinden rol tanımlayarak giriş yapar.</p>
      </section>
    </div>
  )
}
