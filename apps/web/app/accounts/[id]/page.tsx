"use client"
import { useEffect, useState } from 'react'
import { getSdk } from '../../../lib/sdk'

export default function AccountDetail({ params }: { params: { id: string } }) {
  const { id } = params
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [actHist, setActHist] = useState<any[]|null>(null)
  const [dealHist, setDealHist] = useState<any[]|null>(null)
  const [taskHist, setTaskHist] = useState<any[]|null>(null)
  const [tab, setTab] = useState<'profile'|'history'>('profile')
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    ;(async ()=>{
      try {
        const d = await getSdk().accountDetail(id)
        setData(d)
        setContacts((d as any).contacts || [])
        setNotes((d as any).notesRel || [])
        // preload histories in background
        getSdk().accountActivityHistory(id).then((h:any)=> setActHist(h)).catch(()=>setActHist([]))
        getSdk().accountDealHistory(id).then((h:any)=> setDealHist(h)).catch(()=>setDealHist([]))
        getSdk().accountTaskHistory(id).then((h:any)=> setTaskHist(h)).catch(()=>setTaskHist([]))
      } catch (e:any) { setError(e?.error?.message || e.message) }
    })()
  }, [id])
  useEffect(()=>{ getSdk().me().then((r:any)=> setRole(r?.user?.role || null)).catch(()=> setRole(null)) },[])

  if (error) return <p className="text-red-600">{error}</p>
  if (!data) return <p>Yükleniyor…</p>

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">{data.accountName} <span className="text-xs text-slate-500">• {data.id}</span></h2>
        <div className="flex items-center gap-2">
          <a href={`/accounts/${id}/edit`} className="text-blue-600">Düzenle</a>
          {(role === 'MANAGER' || role === 'ADMIN') && (
            <button className="border rounded-md px-3 py-2" onClick={async ()=>{
              try {
                const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
                const res = await fetch(`${base}/accounts/${id}/duplicate`, { method:'POST', headers: { 'Content-Type':'application/json', 'x-user-role': role||'MANAGER', 'x-user-id': (typeof window!=='undefined' && (window.localStorage.getItem('userId')||window.localStorage.getItem('devUserId'))) || 'dev-user' } })
                if (!res.ok) throw await res.json().catch(()=> new Error(res.statusText))
                const created = await res.json()
                window.location.href = `/accounts/${created.id}`
              } catch (e:any) { alert(e?.error?.message || e.message) }
            }}>Save As New</button>
          )}
          {role === 'ADMIN' && (
            <button className="border rounded-md px-3 py-2" onClick={async ()=>{
              if (!confirm('Bu account’u silmek istediğinizden emin misiniz? İlişkili task/lead/deal olmamalı.')) return
              try {
                const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
                const res = await fetch(`${base}/accounts/${id}`, { method:'DELETE', headers: { 'x-user-role': 'ADMIN', 'x-user-id': (typeof window!=='undefined' && (window.localStorage.getItem('userId')||window.localStorage.getItem('devUserId'))) || 'dev-user' } })
                if (!res.ok) throw await res.json().catch(()=> new Error(res.statusText))
                window.location.href = '/accounts'
              } catch (e:any) { alert(e?.error?.message || e.message) }
            }}>Delete</button>
          )}
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <button className={`px-3 py-2 border rounded-md ${tab==='profile'?'bg-slate-100':''}`} onClick={()=> setTab('profile')}>Profile</button>
        <button className={`px-3 py-2 border rounded-md ${tab==='history'?'bg-slate-100':''}`} onClick={()=> setTab('history')}>History</button>
      </div>

      {tab==='profile' && (
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Info title="Business Name" value={data.businessName} />
        <Info title="Account ID" value={(data as any).accountPublicId} />
        <Info title="Status" value={data.status} />
        <Info title="Source" value={data.source} />
        <Info title="Type" value={data.type} />
        <Info title="Main Category" value={(data as any).mainCategory} />
        <Info title="Sub Category" value={(data as any).subCategory} />
        <Info title="City" value={(data as any).city} />
        <Info title="District" value={(data as any).district} />
        <Info title="Website" value={(data as any).website} link />
        <Info title="Instagram" value={(data as any).instagram} link />
        <Info title="Address" value={(data as any).address} long />
        <Info title="Business Contact" value={data.businessContact} />
        <Info title="Contact Person" value={data.contactPerson} />
        <Info title="Notes" value={data.notes} long />
      </section>
      )}

      {tab==='history' && (
        <section className="grid gap-3">
          <div>
            <h3 className="font-semibold mb-1">Activity History</h3>
            {!actHist && <div className="text-sm text-slate-500">Yükleniyor…</div>}
            <div className="grid gap-2">
              {(actHist||[]).map((h:any)=> (
                <div key={h.id} className="border rounded-md p-2 text-sm">
                  <div className="text-xs text-slate-500">{new Date(h.createdAt).toLocaleString('tr-TR')} • {h.type}</div>
                  <div>{h.summary}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Deal History</h3>
            {!dealHist && <div className="text-sm text-slate-500">Yükleniyor…</div>}
            <div className="grid gap-2">
              {(dealHist||[]).map((h:any)=> (
                <div key={h.id} className="border rounded-md p-2 text-sm">
                  <div className="text-xs text-slate-500">{new Date(h.createdAt).toLocaleString('tr-TR')} • {h.action}</div>
                  {h.previousValue && <pre className="bg-slate-50 rounded p-2 text-xs overflow-auto">{JSON.stringify(h.previousValue,null,2)}</pre>}
                  {h.newValue && <pre className="bg-slate-50 rounded p-2 text-xs overflow-auto">{JSON.stringify(h.newValue,null,2)}</pre>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Task History</h3>
            {!taskHist && <div className="text-sm text-slate-500">Yükleniyor…</div>}
            <div className="grid gap-2">
              {(taskHist||[]).map((t:any)=> (
                <a key={t.id} href={`/tasks/${t.id}`} className="border rounded-md p-2 text-sm text-slate-900 no-underline flex justify-between">
                  <div>{t.status} • {t.generalStatus}</div>
                  <div className="text-xs text-slate-500">{new Date(t.creationDate).toLocaleString('tr-TR')}</div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-2">
        <h3 className="font-semibold">Contacts</h3>
        <div className="grid gap-2">
          {contacts.length === 0 && <div className="text-sm text-slate-500">Kayıt yok</div>}
          {contacts.map((c:any)=> (
            <div key={c.id} className="border rounded-md p-2 text-sm">
              <div className="flex justify-between">
                <div><strong>{c.name}</strong> <span className="text-xs text-slate-500">({c.type}) {c.isPrimary ? '• Primary' : ''}</span></div>
                <div className="text-xs text-slate-500">{c.email || '-'} {c.phone ? `• ${c.phone}` : ''}</div>
              </div>
              {c.address && <div className="text-xs text-slate-600">{c.address}</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-2">
        <h3 className="font-semibold">Notes</h3>
        <div className="flex gap-2 items-center">
          <input value={newNote} onChange={(e)=>setNewNote(e.target.value)} placeholder="Yeni not" className="border rounded-md px-3 py-2 flex-1" />
          <button className="border rounded-md px-3 py-2" onClick={async ()=>{ if(!newNote.trim()) return; await getSdk().accountCreateNote(id, newNote.trim()); setNewNote(''); const d= await getSdk().accountDetail(id) as any; setNotes(d.notesRel||[]) }}>Ekle</button>
        </div>
        <div className="grid gap-2">
          {notes.length === 0 && <div className="text-sm text-slate-500">Kayıt yok</div>}
          {notes.map((n:any)=> (
            <div key={n.id} className="border rounded-md p-2 text-sm flex justify-between items-center">
              <div>{n.content}</div>
              <button className="text-xs text-red-600" onClick={async ()=>{ await getSdk().accountDeleteNote(id, n.id); const d= await getSdk().accountDetail(id) as any; setNotes(d.notesRel||[]) }}>Sil</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Info({ title, value, long, link }: { title: string; value?: string | null; long?: boolean; link?: boolean }) {
  const v = value || '-'
  return (
    <div className="border rounded-md p-3">
      <div className="text-xs text-slate-500">{title}</div>
      {link && v && v !== '-' ? (
        <a href={v} className="text-sm text-blue-600 break-all" target="_blank" rel="noreferrer">{v}</a>
      ) : (
        <div className={`text-sm ${long ? 'break-words' : 'truncate'}`}>{v}</div>
      )}
    </div>
  )
}
