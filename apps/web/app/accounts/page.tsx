"use client"
import { useEffect, useState } from 'react'
import { getSdk } from '../../lib/sdk'
import { AsyncSelect } from '../../components/AsyncSelect'

type Account = { id: string; accountName: string; businessName: string; status: string; creationDate: string }

export default function AccountsPage() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [city, setCity] = useState<string>('')
  const [district, setDistrict] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [source, setSource] = useState<string>('')
  const [type, setType] = useState<string>('')
  const [sort, setSort] = useState<string>('name_asc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)

  async function load() {
    setLoading(true)
    try {
      const params: any = { q, page, limit, sort }
      if (city) params.city = city
      if (district) params.district = district
      if (status) params.status = status
      if (source) params.source = source
      if (type) params.type = type
      const res: any = await getSdk().accountsList(params)
      setItems(res.items || [])
      setTotal(res.total || 0)
    } catch (e: any) {
      setError(e?.error?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, limit])

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold mb-2">Accounts</h2>
        <a href="/accounts/new" className="text-blue-600">Yeni Account</a>
      </div>
      <div className="grid gap-2 mb-3">
        <div className="flex gap-2 flex-wrap items-center">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara…" className="border rounded-md px-3 py-2" />
          <AsyncSelect placeholder="City…" value={city || undefined} onChange={(v)=>{ setCity(v); setDistrict('') }} fetcher={async (qq)=>{
            const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
            const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
            const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'MANAGER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
            const res = await f(`${base}/lov?type=CITY`, { headers: hdrs }); const arr = await res.json() as any[]
            const filtered = (qq ? arr.filter(x => String(x.label).toLowerCase().includes(qq.toLowerCase())) : arr)
            return filtered.map(x => ({ value: x.label, label: x.label }))
          }} />
          <AsyncSelect placeholder="District…" value={district || undefined} onChange={(v)=> setDistrict(v)} fetcher={async (qq)=>{
            if (!city) return []
            const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
            const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
            const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'MANAGER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
            const url = new URL(`${base}/lov`); url.searchParams.set('type','DISTRICT'); url.searchParams.set('code', city)
            const res = await f(url.toString(), { headers: hdrs }); const arr = await res.json() as any[]
            const filtered = (qq ? arr.filter(x => String(x.label).toLowerCase().includes(qq.toLowerCase())) : arr)
            return filtered.map(x => ({ value: x.label, label: x.label }))
          }} />
          <select value={status} onChange={(e)=> setStatus(e.target.value)} className="border rounded-md px-3 py-2">
            <option value="">Status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PASSIVE">PASSIVE</option>
          </select>
          <select value={source} onChange={(e)=> setSource(e.target.value)} className="border rounded-md px-3 py-2">
            <option value="">Source</option>
            {['QUERY','FRESH','RAKIP','REFERANS','OLD'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={type} onChange={(e)=> setType(e.target.value)} className="border rounded-md px-3 py-2">
            <option value="">Type</option>
            {['KEY','LONG_TAIL'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={sort} onChange={(e)=> setSort(e.target.value)} className="border rounded-md px-3 py-2">
            <option value="name_asc">Name ↑</option>
            <option value="name_desc">Name ↓</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
          <button onClick={()=>{ setPage(1); load() }} className="border rounded-md px-3 py-2">Uygula</button>
          <button onClick={()=>{ setQ(''); setCity(''); setDistrict(''); setStatus(''); setSource(''); setType(''); setSort('name_asc'); setPage(1); load() }} className="border rounded-md px-3 py-2">Temizle</button>
        </div>
        <div className="flex items-center gap-2">
          <button disabled={page<=1} onClick={()=> setPage(p=> Math.max(1, p-1))} className="border rounded-md px-2 py-1">←</button>
          <span className="text-sm">Sayfa {page} / {Math.max(1, Math.ceil(total / limit))} • Toplam {total}</span>
          <button disabled={page>=Math.ceil(total/limit)} onClick={()=> setPage(p=> p+1)} className="border rounded-md px-2 py-1">→</button>
        </div>
      </div>
      {loading && <p>Yükleniyor…</p>}
      {error && <p className="text-red-600">{error}</p>}
      <ul className="grid gap-2">
        {items.map(a => (
          <li key={a.id} className="border rounded-md px-3 py-2">
            <a href={`/accounts/${a.id}`} className="font-semibold text-slate-900">{a.accountName}</a>
            <div className="text-xs text-slate-600">{a.businessName} • {new Date(a.creationDate).toLocaleDateString('tr-TR')} • {a.status}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
