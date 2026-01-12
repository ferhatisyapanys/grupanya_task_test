"use client"
import { useEffect, useState } from 'react'
import { getSdk } from '../../../lib/sdk'
import { AsyncSelect } from '../../../components/AsyncSelect'
import CategorySelector from '../../../components/CategorySelector'
import { useToast } from '../../../components/Toaster'
import { useSearchParams } from 'next/navigation'

export default function NewAccountPage() {
  const { push } = useToast()
  const search = useSearchParams()
  const [form, setForm] = useState({
    accountName: '', businessName: '', category: '', source: 'QUERY', type: 'LONG_TAIL', status: 'ACTIVE', businessContact: '', contactPerson: '', notes: '', website: '', instagram: ''
  })
  const [catMain, setCatMain] = useState('')
  const [catSub, setCatSub] = useState('')

  // Prefill from URL params (lead/task context)
  useEffect(() => {
    if (!search) return
    const next: any = { ...form }
    const map: Record<string,string> = {
      accountName: 'accountName', businessName: 'businessName', category: 'category', source: 'source', type: 'type', status: 'status',
      businessContact: 'businessContact', contactPerson: 'contactPerson', notes: 'notes', website: 'website', instagram: 'instagram', address: 'address', city: 'city', district: 'district'
    }
    let changed = false
    for (const [k, dest] of Object.entries(map)) {
      const v = search.get(k)
      if (v != null) { (next as any)[dest] = v; changed = true }
    }
    if (changed) setForm(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit() {
    try {
      const res = await getSdk().accountCreate(form)
      push({ type: 'success', message: 'Account oluşturuldu.' })
      window.location.href = `/accounts/${(res as any).id}`
    } catch (e: any) {
      push({ type: 'error', message: e?.error?.message || e.message })
    }
  }

  return (
    <div className="grid gap-2 max-w-xl">
      <h2 className="text-lg font-semibold">Yeni Account</h2>
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
        <a href="/accounts" className="px-3 py-2">İptal</a>
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
