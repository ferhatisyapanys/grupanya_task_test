"use client"
import { useEffect, useState } from 'react'
import { getSdk } from '../../../../lib/sdk'
import { AsyncSelect } from '../../../../components/AsyncSelect'
import CategorySelector from '../../../../components/CategorySelector'
import { useToast } from '../../../../components/Toaster'

export default function EditAccount({ params }: { params: { id: string } }) {
  const { id } = params
  const { push } = useToast()
  const [form, setForm] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)
  const [catMain, setCatMain] = useState('')
  const [catSub, setCatSub] = useState('')

  useEffect(() => {
    getSdk().accountDetail(id).then((d: any) => {
      setForm({
      accountName: d.accountName, businessName: d.businessName, category: d.category, source: d.source, type: d.type, status: d.status, businessContact: d.businessContact || '', contactPerson: d.contactPerson || '', notes: d.notes || '', website: d.website || '', instagram: (d as any).instagram || ''
      })
      const parts = String(d.category||'').split(' / ')
      if (parts && parts.length) { setCatMain(parts[0] || ''); setCatSub(parts[1] || '') }
    }).catch((e) => setErr(e?.error?.message || e.message))
  }, [id])

  async function submit() {
    try {
      await getSdk().accountUpdate(id, form)
      push({ type: 'success', message: 'Account güncellendi.' })
      window.location.href = `/accounts/${id}`
    } catch (e: any) {
      push({ type: 'error', message: e?.error?.message || e.message })
    }
  }

  async function saveAsNew() {
    try {
      const body: any = {
        accountName: form.accountName,
        businessName: form.businessName,
        category: form.category,
        source: form.source,
        type: form.type,
        status: form.status,
        businessContact: form.businessContact || undefined,
        contactPerson: form.contactPerson || undefined,
        notes: form.notes || undefined,
        website: form.website || undefined,
        instagram: form.instagram || undefined,
        city: form.city || undefined,
        district: form.district || undefined,
        address: form.address || undefined,
      }
      const created = await getSdk().accountCreate(body)
      push({ type: 'success', message: 'Yeni account oluşturuldu.' })
      window.location.href = `/accounts/${(created as any).id}`
    } catch (e: any) {
      push({ type: 'error', message: e?.error?.message || e.message })
    }
  }

  if (err) return <p className="text-red-600">{err}</p>
  if (!form) return <p>Yükleniyor…</p>

  return (
    <div className="grid gap-2 max-w-xl">
      <h2 className="text-lg font-semibold">Account Düzenle</h2>
      <Input label="Account Name" value={form.accountName} onChange={(v) => setForm({ ...form, accountName: v })} />
      <Input label="Business Name" value={form.businessName} onChange={(v) => setForm({ ...form, businessName: v })} />
      <label className="grid gap-1">
        <span className="text-xs text-slate-600">Category</span>
        <CategorySelector
          main={catMain}
          sub={catSub}
          onChange={(main, sub)=>{ setCatMain(main); setCatSub(sub); setForm({ ...form, category: sub ? `${main} / ${sub}` : main }) }}
        />
      </label>
      <Row>
        <Select label="Source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} options={['QUERY','FRESH','RAKIP','REFERANS','OLD']} />
        <Select label="Type" value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={['KEY','LONG_TAIL']} />
        <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={['ACTIVE','PASSIVE']} />
      </Row>
      <div className="flex gap-2">
        <SelectLov label="City" type="CITY" value={(form as any).city || ''} onChange={(v)=> setForm({ ...form, city: v, district: '' })} />
        <SelectLov label="District" type="DISTRICT" code={(form as any).city || ''} value={(form as any).district || ''} onChange={(v)=> setForm({ ...form, district: v })} />
      </div>
      <Input label="Business Contact" value={form.businessContact} onChange={(v) => setForm({ ...form, businessContact: v })} />
      <Input label="Contact Person" value={form.contactPerson} onChange={(v) => setForm({ ...form, contactPerson: v })} />
      <Input label="Website" value={(form as any).website || ''} onChange={(v) => setForm({ ...form, website: v })} />
      <Input label="Instagram" value={(form as any).instagram || ''} onChange={(v) => setForm({ ...form, instagram: v })} />
      <Input label="Address" value={(form as any).address || ''} onChange={(v) => setForm({ ...form, address: v })} />
      <Input label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
      <div className="flex gap-2">
        <button onClick={submit} className="px-3 py-2 border rounded-md">Kaydet</button>
        <button onClick={saveAsNew} className="px-3 py-2 border rounded-md">Save As New</button>
        <a href={`/accounts/${id}`} className="px-3 py-2">İptal</a>
      </div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) { return <div className="flex gap-2">{children}</div> }
function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-slate-600">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="border rounded-md px-3 py-2" />
    </label>
  )
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="grid gap-1 flex-1">
      <span className="text-xs text-slate-600">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="border rounded-md px-3 py-2">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

function SelectLov({ label, type, value, onChange, code }: { label: string; type: string; value: string; onChange:(v:string)=>void; code?: string }) {
  return (
    <label className="grid gap-1 flex-1">
      <span className="text-xs text-slate-600">{label}</span>
      <AsyncSelect
        placeholder={`${label} ara…`}
        value={value || undefined}
        onChange={onChange}
        fetcher={async (q) => {
          const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
          const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
          const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'MANAGER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
          const url = new URL(`${base}/lov`)
          url.searchParams.set('type', type)
          if (code) url.searchParams.set('code', code)
          const res = await f(url.toString(), { headers: hdrs })
          const arr = await res.json() as any[]
          const filtered = (q ? arr.filter(x => String(x.label).toLowerCase().includes(q.toLowerCase())) : arr)
          return filtered.map(x => ({ value: x.label, label: x.label }))
        }}
      />
    </label>
  )
}
