"use client"
import { useEffect, useState } from 'react'
import { getSdk } from '../../../lib/sdk'
import { Button } from '@grupanya/ui'
import { AsyncSelect } from '../../../components/AsyncSelect'
import CategorySelector from '../../../components/CategorySelector'
import { useToast } from '../../../components/Toaster'

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { push } = useToast()
  const [lead, setLead] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)
  const [edit, setEdit] = useState<any | null>(null)
  const [catMain, setCatMain] = useState('')
  const [catSub, setCatSub] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [linkedAccount, setLinkedAccount] = useState<any | null>(null)

  async function load() {
    try {
      const d = await getSdk().leadDetail(id)
      setLead(d)
      if ((d as any)?.linkedAccountId) {
        try { const acc = await getSdk().accountDetail((d as any).linkedAccountId); setLinkedAccount(acc as any) } catch { setLinkedAccount(null) }
      } else { setLinkedAccount(null) }
    } catch (e:any) {
      setErr(e?.error?.message || e.message)
    }
  }
  useEffect(()=>{ load() }, [id])
  useEffect(()=>{
    getSdk().me().then((r:any)=> setRole(r?.user?.role || null)).catch(()=> setRole(null))
  },[])

  async function save() {
    if (!edit) return
    try {
      await getSdk().leadUpdate(id, edit)
      push({ type:'success', message:'Lead güncellendi' })
      setEdit(null)
      await load()
    } catch (e:any) { push({ type:'error', message: e?.error?.message || e.message }) }
  }

  async function saveAsNew() {
    // Prefer edited values if present, and keep the same name (no suffix)
    const cur = edit || {}
    const uniqueName = (cur.company || lead?.company || lead?.payload?.accountName || 'Lead').toString().trim()

    const body: any = {
      accountName: uniqueName,
      businessName: uniqueName,
      category: cur.webCategory || lead?.webCategory || lead?.payload?.category || '',
      createdAt: new Date().toISOString(),
      city: cur.city || lead?.city || lead?.payload?.city || undefined,
      district: cur.district || lead?.district || lead?.payload?.district || undefined,
      email: cur.email || lead?.email || undefined,
      phone: cur.phone || lead?.phone || undefined,
      contactPerson: cur.person || lead?.person || undefined,
      website: cur.website || lead?.website || lead?.payload?.website || undefined,
      instagram: cur.instagram || lead?.payload?.instagram || undefined,
      // Keep payload merged, align visible name fields
      payload: { ...(lead?.payload || {}), accountName: uniqueName, businessName: uniqueName },
    }
    try {
      const created = await getSdk().leadCreate(body)
      push({ type:'success', message:'Yeni lead oluşturuldu' })
      window.location.href = '/leads'
    } catch (e:any) { push({ type:'error', message: e?.error?.message || e.message }) }
  }

  if (err) return <div className="text-red-600">{err}</div>
  if (!lead) return <div>Yükleniyor…</div>

  return (
    <div className="grid gap-3">
      <a href="/leads" className="text-blue-600">← Leads</a>
      <div className="border rounded-md p-3">
        <div className="flex justify-between items-baseline">
          <h2 className="text-lg font-semibold">{lead.company || lead.payload?.accountName || 'Lead'}</h2>
          <div className="text-xs text-slate-500">#{lead.id}</div>
        </div>
        <div className="text-sm text-slate-700">{new Date(lead.createdAt).toLocaleString('tr-TR')}</div>
        {linkedAccount && (
          <div className="mt-2 text-sm">
            <span className="text-slate-600">Linked Account: </span>
            <a className="text-blue-600" href={`/accounts/${linkedAccount.id}`}>{linkedAccount.accountName}</a>
            {(role === 'MANAGER' || role === 'ADMIN') && (
              <Button variant="secondary" onClick={async()=>{
                if (!confirm('Bu lead’in account bağlantısını kaldırmak istiyor musunuz?')) return
                try {
                  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
                  const res = await fetch(`${base}/leads/${id}/unlink`, { method:'PATCH', headers: { 'x-user-role': role||'MANAGER', 'x-user-id': (typeof window!=='undefined' && (window.localStorage.getItem('userId')||window.localStorage.getItem('devUserId'))) || 'dev-user' } })
                  if (!res.ok) throw await res.json().catch(()=> new Error(res.statusText))
                  await load()
                } catch (e:any) { push({ type:'error', message: e?.error?.message || e.message }) }
              }} style={{ marginLeft: 8 }}>Unlink</Button>
            )}
          </div>
        )}
      </div>

      <section className="border rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Edit</h3>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={()=> { setEdit({
              company: lead.company || '',
              webCategory: lead.webCategory || '',
              city: lead.city || '',
              district: lead.district || '',
              email: lead.email || '',
              phone: lead.phone || '',
              person: lead.person || '',
              website: lead.website || '',
              instagram: lead.payload?.instagram || '',
            }); const parts = String(lead.webCategory||'').split(' / '); if (parts.length){ setCatMain(parts[0]||''); setCatSub(parts[1]||'') } }}>Düzenle</Button>
            <Button variant="secondary" onClick={saveAsNew}>Save As New</Button>
            {role === 'ADMIN' && (
              <Button variant="secondary" onClick={async()=>{
                if (!confirm('Bu lead’i silmek istediğinizden emin misiniz?')) return
                try {
                  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
                  const res = await fetch(`${base}/leads/${id}`, { method: 'DELETE', headers: { 'x-user-role': 'ADMIN', 'x-user-id': (typeof window!== 'undefined' && (window.localStorage.getItem('userId')||window.localStorage.getItem('devUserId'))) || 'dev-user' } })
                  if (!res.ok) throw await res.json().catch(()=> new Error(res.statusText))
                  push({ type:'success', message:'Lead silindi' })
                  window.location.href = '/leads'
                } catch (e:any) { push({ type:'error', message: e?.error?.message || e.message }) }
              }}>Delete</Button>
            )}
          </div>
        </div>
        {edit && (
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <input className="border rounded-md px-2 py-2" placeholder="Company" value={edit.company} onChange={(e)=> setEdit({ ...edit, company: e.target.value })} />
              <CategorySelector
                main={catMain}
                sub={catSub}
                onChange={(main, sub)=> { setCatMain(main); setCatSub(sub); setEdit({ ...edit, webCategory: sub ? `${main} / ${sub}` : main }) }}
              />
              <AsyncSelect placeholder="City…" value={edit.city||undefined} onChange={(v)=> setEdit({...edit, city:v, district:''})} fetcher={async (q)=>{
                const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
                const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
                const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'MANAGER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
                const res = await f(`${base}/lov?type=CITY`, { headers: hdrs }); const arr = await res.json() as any[]
                const filtered = (q ? arr.filter((x:any)=> String(x.label).toLowerCase().includes(q.toLowerCase())) : arr)
                return filtered.map((x:any)=> ({ value: x.label, label: x.label }))
              }} />
              <AsyncSelect placeholder="District…" value={edit.district||undefined} onChange={(v)=> setEdit({...edit, district:v})} fetcher={async (q)=>{
                if (!edit.city) return []
                const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
                const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
                const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'MANAGER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
                const url = new URL(`${base}/lov`); url.searchParams.set('type','DISTRICT'); url.searchParams.set('code', edit.city)
                const res = await f(url.toString(), { headers: hdrs }); const arr = await res.json() as any[]
                const filtered = (q ? arr.filter((x:any)=> String(x.label).toLowerCase().includes(q.toLowerCase())) : arr)
                return filtered.map((x:any)=> ({ value: x.label, label: x.label }))
              }} />
              <input className="border rounded-md px-2 py-2" placeholder="Email" value={edit.email} onChange={(e)=> setEdit({ ...edit, email: e.target.value })} />
              <input className="border rounded-md px-2 py-2" placeholder="Phone" value={edit.phone} onChange={(e)=> setEdit({ ...edit, phone: e.target.value })} />
              <input className="border rounded-md px-2 py-2" placeholder="Contact Person" value={edit.person} onChange={(e)=> setEdit({ ...edit, person: e.target.value })} />
              <input className="border rounded-md px-2 py-2" placeholder="Website" value={edit.website} onChange={(e)=> setEdit({ ...edit, website: e.target.value })} />
              <input className="border rounded-md px-2 py-2" placeholder="Instagram" value={edit.instagram} onChange={(e)=> setEdit({ ...edit, instagram: e.target.value })} />
            </div>
            <div>
              <Button variant="secondary" onClick={save}>Kaydet</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
