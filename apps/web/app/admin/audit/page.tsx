"use client"
import { useEffect, useState } from 'react'
import { apiGet } from '../../../lib/api'

type Row = { id: string; entityType: string; entityId: string; action: string; userId?: string|null; createdAt: string; ipAddress?: string|null; userAgent?: string|null; previousData?: any; newData?: any }

export default function AuditPage() {
  const [items, setItems] = useState<Row[]>([])
  const [q, setQ] = useState({ entityType: '', entityId: '', userId: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)

  async function load() {
    const usp = new URLSearchParams()
    if (q.entityType) usp.set('entityType', q.entityType)
    if (q.entityId) usp.set('entityId', q.entityId)
    if (q.userId) usp.set('userId', q.userId)
    if (q.from) usp.set('from', q.from)
    if (q.to) usp.set('to', q.to)
    usp.set('page', String(page))
    usp.set('limit', String(limit))
    const res: any = await apiGet(`/audit?${usp.toString()}`, { headers: { 'x-user-role': 'ADMIN' } })
    setItems(res.items||[]); setTotal(res.total||0)
  }
  useEffect(()=>{ load() }, [page, limit])

  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">Audit Log</h2>
      <div className="flex gap-2 items-center flex-wrap">
        <select value={q.entityType} onChange={(e)=> setQ({ ...q, entityType: e.target.value })} className="border rounded-md px-2 py-2">
          <option value="">Entity</option>
          {['USER','LEAD','ACCOUNT','TASK','DEAL','TASKLIST','LOOKUP'].map(x=> <option key={x} value={x}>{x}</option>)}
        </select>
        <input value={q.entityId} onChange={(e)=> setQ({ ...q, entityId: e.target.value })} placeholder="Entity ID" className="border rounded-md px-2 py-2" />
        <input value={q.userId} onChange={(e)=> setQ({ ...q, userId: e.target.value })} placeholder="User ID" className="border rounded-md px-2 py-2" />
        <label className="text-xs text-slate-600">From</label>
        <input type="date" value={q.from} onChange={(e)=> setQ({ ...q, from: e.target.value })} className="border rounded-md px-2 py-2" />
        <label className="text-xs text-slate-600">To</label>
        <input type="date" value={q.to} onChange={(e)=> setQ({ ...q, to: e.target.value })} className="border rounded-md px-2 py-2" />
        <button onClick={()=>{ setPage(1); load() }} className="border rounded-md px-3 py-2">Uygula</button>
        <div className="ml-auto flex items-center gap-2">
          <button disabled={page<=1} onClick={()=> setPage(p=> Math.max(1,p-1))} className="border rounded-md px-2 py-1">←</button>
          <span className="text-sm">Sayfa {page} / {Math.max(1, Math.ceil(total/limit))} • Toplam {total}</span>
          <button disabled={page>=Math.ceil(total/limit)} onClick={()=> setPage(p=> p+1)} className="border rounded-md px-2 py-1">→</button>
        </div>
      </div>
      <div className="grid gap-2">
        {items.map((r)=> (
          <div key={r.id} className="border rounded-md p-3">
            <div className="text-xs text-slate-600">{new Date(r.createdAt).toLocaleString('tr-TR')} • {r.userId||'-'} • {r.ipAddress||''}</div>
            <div className="text-sm"><strong>{r.entityType}</strong>/{r.entityId} → {r.action}</div>
            {(r.previousData || r.newData) && (
              <details className="mt-1">
                <summary className="text-xs cursor-pointer">Detay</summary>
                <pre className="text-xs bg-slate-50 p-2 rounded-md overflow-auto">{JSON.stringify({ prev: r.previousData||null, next: r.newData||null }, null, 2)}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

