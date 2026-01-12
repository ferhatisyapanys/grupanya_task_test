"use client"
import { useEffect, useState } from 'react'
import { useToast } from '../../components/Toaster'
import { Button } from '@grupanya/ui'
import { getSdk } from '../../lib/sdk'
import { AsyncSelect } from '../../components/AsyncSelect'
import CategorySelector from '../../components/CategorySelector'

type Lead = { id: string; createdAt: string; payload: any; linkedAccountId?: string | null }

export default function LeadsPage() {
  const [items, setItems] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openForm, setOpenForm] = useState(false)
  const [form, setForm] = useState({ accountName: '', businessName: '', category: '', createdAt: '', payloadText: '', city: '', district: '', email: '', phone: '', contactPerson: '', website: '', instagram: '' })
  const [catMain, setCatMain] = useState('')
  const [catSub, setCatSub] = useState('')
  const [phoneValid, setPhoneValid] = useState<boolean|null>(null)
  const [emailValid, setEmailValid] = useState<boolean|null>(null)
  const { push } = useToast()
  // Lead Assistant (search+convert/linkup)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string|undefined>(undefined)
  const [assistantAccountId, setAssistantAccountId] = useState<string|undefined>(undefined)
  const [status, setStatus] = useState<string>('')
  const [source, setSource] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [city, setCity] = useState<string>('')
  const [district, setDistrict] = useState<string>('')

  async function load() {
    setLoading(true)
    try {
      const res: any = await getSdk().leadsList({ status: status || undefined, source: source || undefined, search: search || undefined, from: from || undefined, to: to || undefined, city: city || undefined, district: district || undefined, page, pageSize })
      setItems((res as any).items || [])
      setTotal((res as any).total || 0)
    } catch (e: any) {
      setError(e?.error?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, pageSize])

  async function convert(l: Lead) {
    try {
      await getSdk().leadConvert({
        leadId: l.id,
        account: {
          // Prefer edited/display name on lead; fallback to payload
          accountName: (l as any).company || (l as any).payload?.accountName || `Lead ${l.id}`,
          businessName: (l as any).payload?.businessName || (l as any).company || `Lead ${l.id}`,
          category: (l as any).webCategory || (l as any).payload?.category || 'General',
          type: 'LONG_TAIL',
          source: 'QUERY',
          status: 'ACTIVE'
        }
      })
      push({ type: 'success', message: 'Lead account’a dönüştürüldü.' })
      await load()
    } catch (e: any) {
      push({ type: 'error', message: e?.error?.message || e.message })
    }
  }

  // Linkup: mevcut account ile bağla
  const [linkLeadId, setLinkLeadId] = useState<string | null>(null)
  const [linkAccountId, setLinkAccountId] = useState<string | null>(null)
  async function doLinkup() {
    if (!linkLeadId || !linkAccountId) return
    try {
      const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
      const res = await f((process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api') + '/leads/linkup', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-role': 'MANAGER', 'x-user-id': 'dev-user' }, body: JSON.stringify({ leadId: linkLeadId, accountId: linkAccountId })
      })
      if (!res.ok) throw await res.json()
      push({ type: 'success', message: 'Lead mevcut account ile bağlandı.' })
      setLinkLeadId(null); setLinkAccountId(null)
      await load()
    } catch (e: any) {
      push({ type: 'error', message: e?.error?.message || e.message })
    }
  }

  async function createLead() {
    try {
      // required fields check
      const mobileRe = /^(?:\+90|0)?5\d{9}$/
      if (!form.email || !form.phone || !form.contactPerson || !form.city || !form.district) {
        push({ type: 'error', message: 'Email, Telefon, Kontak Kişi, Şehir ve İlçe zorunludur.' })
        return
      }
      if (!mobileRe.test(form.phone)) {
        push({ type: 'error', message: 'Telefon formatı geçersiz. Örn: 05XXXXXXXXX' })
        return
      }
      const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
      if (!emailRe.test(form.email)) {
        push({ type: 'error', message: 'Email formatı geçersiz.' })
        return
      }
      let payload: any | undefined = undefined
      if (form.payloadText && form.payloadText.trim()) {
        try { payload = JSON.parse(form.payloadText) } catch (e) {
          push({ type: 'error', message: 'Payload JSON geçersiz.' }); return
        }
      }
      await getSdk().leadCreate({
        accountName: form.accountName || undefined,
        businessName: form.businessName || undefined,
        category: form.category || undefined,
        createdAt: form.createdAt || undefined,
        city: form.city || undefined,
        district: form.district || undefined,
        email: form.email,
        phone: form.phone,
        contactPerson: form.contactPerson,
        website: form.website || undefined,
        instagram: form.instagram || undefined,
        payload,
      })
      setForm({ accountName: '', businessName: '', category: '', createdAt: '', payloadText: '', city: '', district: '', email: '', phone: '', contactPerson: '', website: '', instagram: '' })
      push({ type: 'success', message: 'Lead oluşturuldu.' })
      setOpenForm(false)
      await load()
    } catch (e: any) {
      push({ type: 'error', message: e?.error?.message || e.message })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Leads</h2>
        <div className="flex gap-2">
          <Button onClick={() => setAssistantOpen(v=>!v)}>{assistantOpen ? 'Asistanı Kapat' : 'Lead Asistanı'}</Button>
          <Button onClick={() => setOpenForm(v => !v)}>{openForm ? 'Kapat' : 'Yeni Lead'}</Button>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap mb-3 items-center">
        <input value={search} onChange={(e)=> setSearch(e.target.value)} placeholder="Ara (company/email/phone/city)…" className="border rounded-md px-3 py-2" />
        <select value={status} onChange={(e)=> setStatus(e.target.value)} className="border rounded-md px-3 py-2">
          <option value="">Status</option>
          {['NEW','CONVERTED','LINKED','REJECTED'].map(s=> <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={source} onChange={(e)=> setSource(e.target.value)} className="border rounded-md px-3 py-2">
          <option value="">Source</option>
          {['QUERY','FRESH','RAKIP','REFERANS','OLD'].map(s=> <option key={s} value={s}>{s}</option>)}
        </select>
        <AsyncSelect
          placeholder="City…"
          value={city || undefined}
          onChange={(v)=>{ setCity(v); setDistrict('') }}
          fetcher={async (qq) => {
            const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
            const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
            const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'MANAGER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
            const res = await f(`${base}/lov?type=CITY`, { headers: hdrs }); const arr = await res.json() as any[]
            const filtered = (qq ? arr.filter(x => String(x.label).toLowerCase().includes(qq.toLowerCase())) : arr)
            return filtered.map(x => ({ value: x.label, label: x.label }))
          }}
        />
        <AsyncSelect
          placeholder="District…"
          value={district || undefined}
          onChange={(v)=> setDistrict(v)}
          fetcher={async (qq) => {
            if (!city) return []
            const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
            const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
            const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'MANAGER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
            const url = new URL(`${base}/lov`); url.searchParams.set('type','DISTRICT'); url.searchParams.set('code', city)
            const res = await f(url.toString(), { headers: hdrs }); const arr = await res.json() as any[]
            const filtered = (qq ? arr.filter(x => String(x.label).toLowerCase().includes(qq.toLowerCase())) : arr)
            return filtered.map(x => ({ value: x.label, label: x.label }))
          }}
        />
        <input type="date" value={from} onChange={(e)=> setFrom(e.target.value)} className="border rounded-md px-3 py-2" />
        <input type="date" value={to} onChange={(e)=> setTo(e.target.value)} className="border rounded-md px-3 py-2" />
        <Button onClick={()=>{ setPage(1); load() }}>Uygula</Button>
        <Button onClick={()=>{ setStatus(''); setSource(''); setSearch(''); setCity(''); setDistrict(''); setFrom(''); setTo(''); setPage(1); load() }}>Temizle</Button>
        <div className="flex items-center gap-2 ml-auto">
          <button disabled={page<=1} onClick={()=> setPage(p=> Math.max(1,p-1))} className="border rounded-md px-2 py-1">←</button>
          <span className="text-sm">Sayfa {page} / {Math.max(1, Math.ceil(total / pageSize))} • Toplam {total}</span>
          <button disabled={page>=Math.ceil(total/pageSize)} onClick={()=> setPage(p=> p+1)} className="border rounded-md px-2 py-1">→</button>
        </div>
      </div>
      {assistantOpen && (
        <div className="border rounded-md p-3 mb-3 grid gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            {/* Lead select */}
            <AsyncSelect
              placeholder="Lead ara…"
              value={selectedLeadId}
              onChange={setSelectedLeadId as any}
              fetcher={async (q) => {
                const url = new URL((process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api') + '/leads/search')
                url.searchParams.set('q', q)
                const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
                const res = await f(url.toString(), { headers: { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'MANAGER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' } })
                const data = await res.json()
                return (data as any[]).map((d:any) => ({ value: d.id, label: d.label }))
              }}
            />
            {/* Account select for Linkup */}
            <AsyncSelect
              placeholder="Account ara… (Linkup)"
              value={assistantAccountId}
              onChange={setAssistantAccountId as any}
              fetcher={async (q) => {
                const url = new URL((process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api') + '/accounts/search')
                url.searchParams.set('q', q)
                const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
                const res = await f(url.toString(), { headers: { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'MANAGER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' } })
                const data = await res.json()
                return (data as any[]).map((d:any) => ({ value: d.id, label: d.label }))
              }}
            />
            <Button variant="secondary" onClick={async ()=>{
              if (!selectedLeadId) { push({type:'error', message:'Önce bir lead seçin.'}); return }
              try {
                await getSdk().leadConvert({ leadId: selectedLeadId })
                push({ type: 'success', message: 'Lead convert edildi (veya mevcut account ile bağlandı).' })
                await load()
              } catch (e:any) { push({type:'error', message:e?.error?.message || e.message}) }
            }}>Convert</Button>
            <Button variant="secondary" onClick={async ()=>{
              if (!selectedLeadId || !assistantAccountId) { push({type:'error', message:'Lead ve account seçin.'}); return }
              try {
                const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
                const res = await f((process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api') + '/leads/linkup', { method:'POST', headers:{'Content-Type':'application/json','x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'MANAGER','x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user'}, body: JSON.stringify({ leadId: selectedLeadId, accountId: assistantAccountId }) })
                if (!res.ok) throw await res.json()
                push({ type: 'success', message: 'Lead linkup edildi.'})
                await load()
              } catch (e:any) { push({type:'error', message:e?.error?.message || e.message}) }
            }}>Linkup</Button>
          </div>
        </div>
      )}
      {openForm && (
        <div className="border rounded-md p-3 mb-3 grid gap-2">
          <div className="flex gap-2">
            <label className="grid gap-1 flex-1">
              <span className="text-xs text-slate-600">Account Name</span>
              <input className="border rounded-md px-3 py-2" value={form.accountName} onChange={(e)=>setForm({...form, accountName:e.target.value})}/>
            </label>
            <label className="grid gap-1 flex-1">
              <span className="text-xs text-slate-600">Business Name</span>
              <input className="border rounded-md px-3 py-2" value={form.businessName} onChange={(e)=>setForm({...form, businessName:e.target.value})}/>
            </label>
            <label className="grid gap-1 flex-1">
              <span className="text-xs text-slate-600">Category</span>
              <CategorySelector
                main={catMain}
                sub={catSub}
                onChange={(main, sub)=>{ setCatMain(main); setCatSub(sub); setForm({ ...form, category: sub ? `${main} / ${sub}` : main }) }}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <label className="grid gap-1 w-72">
          <span className="text-xs text-slate-600">Email</span>
          <input
            className={`border rounded-md px-3 py-2 ${emailValid===false ? 'border-red-500' : emailValid===true ? 'border-green-500' : ''}`}
            type="email"
            required
            placeholder="Örn: isim@domain.com"
            value={form.email}
            onChange={(e)=>{ const v=e.target.value; setForm({...form, email:v}); const ok=/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v); setEmailValid(v?ok:null) }}
          />
          <small className={`text-xs ${emailValid===false ? 'text-red-600' : 'text-slate-500'}`}>{emailValid===false ? 'Geçersiz email formatı' : 'Format: isim@domain.com'}</small>
        </label>
        <label className="grid gap-1 w-60">
          <span className="text-xs text-slate-600">Telefon</span>
          <input
            className={`border rounded-md px-3 py-2 ${phoneValid===false ? 'border-red-500' : phoneValid===true ? 'border-green-500' : ''}`}
            required
            inputMode="numeric"
            pattern="^(?:\+90|0)?5\d{9}$"
            title="Örn: 05XXXXXXXXX"
            placeholder="Örn: 05XXXXXXXXX veya +905XXXXXXXXX"
            value={form.phone}
            onChange={(e)=>{ const v=e.target.value; setForm({...form, phone:v}); const ok=/^(?:\+90|0)?5\d{9}$/.test(v); setPhoneValid(v?ok:null) }}
          />
          <small className={`text-xs ${phoneValid===false ? 'text-red-600' : 'text-slate-500'}`}>{phoneValid===false ? 'Geçersiz telefon formatı' : 'Mobil format: 05XXXXXXXXX veya +905XXXXXXXXX'}</small>
        </label>
            <label className="grid gap-1 w-60">
              <span className="text-xs text-slate-600">Kontak Kişi</span>
              <input className="border rounded-md px-3 py-2" required value={form.contactPerson} onChange={(e)=>setForm({...form, contactPerson:e.target.value})}/>
            </label>
          </div>
          <div className="flex gap-2">
            <label className="grid gap-1 w-72">
              <span className="text-xs text-slate-600">Website</span>
              <input className="border rounded-md px-3 py-2" value={form.website} onChange={(e)=>setForm({...form, website:e.target.value})}/>
            </label>
            <label className="grid gap-1 w-72">
              <span className="text-xs text-slate-600">Instagram</span>
              <input className="border rounded-md px-3 py-2" value={form.instagram} onChange={(e)=>setForm({...form, instagram:e.target.value})}/>
            </label>
          </div>
          <div className="flex gap-2">
            <SelectLov label="City" type="CITY" value={form.city} onChange={(v)=> setForm({...form, city: v, district: ''})} allowCustom />
            <SelectLov label="District" type="DISTRICT" code={form.city} value={form.district} onChange={(v)=> setForm({...form, district: v})} allowCustom />
          </div>
          <div className="flex gap-2">
            <label className="grid gap-1 w-60">
              <span className="text-xs text-slate-600">Created At</span>
              <input type="datetime-local" className="border rounded-md px-3 py-2" value={form.createdAt} onChange={(e)=>setForm({...form, createdAt:e.target.value})}/>
            </label>
            <label className="grid gap-1 flex-1">
              <span className="text-xs text-slate-600">Payload (JSON)</span>
              <textarea rows={4} className="border rounded-md px-3 py-2 font-mono text-sm" placeholder='{"key":"value"}' value={form.payloadText} onChange={(e)=>setForm({...form, payloadText:e.target.value})}/>
            </label>
          </div>
          <div>
            <Button onClick={createLead}>Kaydet</Button>
          </div>
        </div>
      )}
      {loading && <p>Yükleniyor…</p>}
      {error && <p className="text-red-600">{error}</p>}
      <div className="grid gap-2">
        {items.map(l => (
          <div key={l.id} className="border rounded-lg px-3 py-2 flex items-center justify-between">
            <div>
              <a href={`/leads/${l.id}`} className="font-semibold text-slate-900">{l.company || l.payload?.accountName || 'Lead'}</a>
              <div className="text-xs text-slate-600">{new Date(l.createdAt).toLocaleString('tr-TR')}{l.city ? ` • ${l.city}` : ''}{(l as any).district ? ` / ${(l as any).district}` : ''}</div>
              {l.linkedAccountId && <div className="text-xs">Linked to account</div>}
            </div>
            <div className="flex gap-2">
              {!l.linkedAccountId && <Button onClick={() => convert(l)}>Convert to Account</Button>}
              {!l.linkedAccountId && (
                <>
                  {linkLeadId === l.id ? (
                    <div className="flex items-center gap-2">
                      <AsyncSelect
                        placeholder="Account ara…"
                        value={linkAccountId || undefined}
                        onChange={(val)=> setLinkAccountId(val)}
                        fetcher={async (q) => {
                          const url = new URL((process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api') + '/accounts/search')
                          url.searchParams.set('q', q)
                          const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
                          const res = await f(url.toString(), { headers: { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'MANAGER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' } })
                          const data = await res.json()
                          return (data as any[]).map((d:any) => ({ value: d.id, label: d.label }))
                        }}
                      />
                      <Button variant="secondary" onClick={doLinkup}>Linkup</Button>
                      <Button variant="secondary" onClick={()=>{ setLinkLeadId(null); setLinkAccountId(null) }}>Vazgeç</Button>
                    </div>
                  ) : (
                    <Button variant="secondary" onClick={()=> setLinkLeadId(l.id)}>Linkup</Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
function SelectLov({ label, type, value, onChange, code, allowCustom=false }: { label: string; type: string; value: string; onChange:(v:string)=>void; code?: string; allowCustom?: boolean }) {
  return (
    <label className="grid gap-1 flex-1">
      <span className="text-xs text-slate-600">{label}</span>
      <div className="flex gap-2 items-center">
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
        {allowCustom && (
          <input className="border rounded-md px-2 py-2 w-36" placeholder={`Özel ${label}`}
            value={value}
            onChange={(e)=> onChange(e.target.value)} />
        )}
      </div>
    </label>
  )
}
