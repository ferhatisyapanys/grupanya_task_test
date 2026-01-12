"use client"
import { useEffect, useState } from 'react'
import { getSdk } from '../../lib/sdk'
import { apiGet } from '../../lib/api'

export default function UsersPage() {
  const [items, setItems] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('SALESPERSON')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string| null>(null)
  const [managers, setManagers] = useState<any[]>([])
  const [managerId, setManagerId] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  async function load() {
    try {
      const res = await apiGet<any[]>(`/users${showInactive ? '?includeInactive=1' : ''}`, { headers: { 'x-user-role': 'ADMIN' } })
      setItems(res||[])
      setManagers((res||[]).filter(u => u.role === 'MANAGER' && u.isActive))
    } catch(e:any){ setErr(e?.error?.message||e.message) }
  }
  useEffect(()=>{ load() }, [showInactive])

  async function create() {
    try {
      const body: any = { email, name, role, password: password || undefined }
      if (role === 'SALESPERSON') body.managerId = managerId || undefined
      const res = await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:3001/api')+'/users', { method:'POST', headers:{'Content-Type':'application/json','x-user-role':'ADMIN','x-user-id':'dev-user'}, body: JSON.stringify(body) })
      if (!res.ok) throw await res.json().catch(()=> new Error(res.statusText))
      setEmail(''); setName(''); setPassword(''); setManagerId(''); setErr(null); await load()
    } catch (e:any) { setErr(e?.error?.message || e.message || 'Create failed') }
  }

  async function changeRole(id: string, newRole: string, newManagerId?: string) {
    await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:3001/api')+`/users/${id}/role`, { method:'PATCH', headers:{'Content-Type':'application/json','x-user-role':'ADMIN','x-user-id':'dev-user'}, body: JSON.stringify({ role: newRole, managerId: newManagerId || undefined }) }); await load()
  }
  async function deactivate(id: string) {
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:3001/api')+`/users/${id}/deactivate`, { method:'PATCH', headers:{'x-user-role':'ADMIN','x-user-id':'dev-user'} })
      if (!res.ok) throw await res.json().catch(()=> new Error(res.statusText))
      await load()
    } catch (e:any) {
      setErr(e?.error?.message || e.message || 'Deactivate failed')
    }
  }
  async function setPwd(id: string) { const p = prompt('Yeni şifre?'); if(!p) return; await fetch((process.env.NEXT_PUBLIC_API_BASE||'http://localhost:3001/api')+`/users/${id}/password`, { method:'PATCH', headers:{'Content-Type':'application/json','x-user-role':'ADMIN','x-user-id':'dev-user'}, body: JSON.stringify({ password: p }) }); alert('Şifre güncellendi') }

  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">Users</h2>
      {err && <div className="text-red-600">{err}</div>}
      <div className="flex gap-2 items-end flex-wrap">
        <label className="grid gap-1">
          <span className="text-xs text-slate-600">Email</span>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} className="border rounded-md px-3 py-2" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-slate-600">Name</span>
          <input value={name} onChange={(e)=>setName(e.target.value)} className="border rounded-md px-3 py-2" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-slate-600">Role</span>
          <select value={role} onChange={(e)=>setRole(e.target.value)} className="border rounded-md px-3 py-2">
            {['ADMIN','MANAGER','TEAM_LEADER','SALESPERSON'].map(r=>(<option key={r} value={r}>{r}</option>))}
          </select>
        </label>
        {role==='SALESPERSON' && (
          <label className="grid gap-1">
            <span className="text-xs text-slate-600">Manager</span>
            <select value={managerId} onChange={(e)=> setManagerId(e.target.value)} className="border rounded-md px-3 py-2">
              <option value="">Seçin…</option>
              {managers.map(m => (<option key={m.id} value={m.id}>{m.name || m.email}</option>))}
            </select>
          </label>
        )}
        <label className="grid gap-1">
          <span className="text-xs text-slate-600">Password (opsiyonel)</span>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="border rounded-md px-3 py-2" />
        </label>
        <button onClick={create} className="border rounded-md px-3 py-2">Create</button>
        <label className="flex items-center gap-2 ml-auto text-sm">
          <input type="checkbox" checked={showInactive} onChange={(e)=> setShowInactive(e.target.checked)} /> Show inactive
        </label>
      </div>
      <div className="grid gap-2">
        {items.map(u => (
          <div key={u.id} className="border rounded-md p-2 flex justify-between items-center">
            <div>
              <div className="font-semibold">{u.name || u.email}</div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>{u.email} • {u.role}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>{u.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
              </div>
            </div>
            <div className="flex gap-2 items-center text-sm">
              <select value={u.role} onChange={(e)=> changeRole(u.id, e.target.value, undefined)} className="border rounded-md px-2 py-1">
                {['ADMIN','MANAGER','TEAM_LEADER','SALESPERSON'].map(r=>(<option key={r} value={r}>{r}</option>))}
              </select>
              {u.role==='SALESPERSON' && (
                <select value={(u as any).managerId || ''} onChange={(e)=> changeRole(u.id, 'SALESPERSON', e.target.value || undefined)} className="border rounded-md px-2 py-1">
                  <option value="">Manager…</option>
                  {managers.map(m => (<option key={m.id} value={m.id}>{m.name || m.email}</option>))}
                </select>
              )}
              <button className="border rounded-md px-2 py-1" onClick={()=> setPwd(u.id)}>Set Password</button>
              {u.isActive ? (
                <button className="border rounded-md px-2 py-1 text-red-600" onClick={()=> deactivate(u.id)}>Deactivate</button>
              ) : (
                <span className="text-xs text-slate-500">Deactivated</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
