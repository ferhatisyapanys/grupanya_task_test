"use client"
import { useEffect, useState } from 'react'
import { apiGet, apiPatch, apiPost, apiDelete } from '../../lib/api'
import { useToast } from '../../components/Toaster'
import { Button } from '@grupanya/ui'

type TaskList = { id: string; name: string; tag: 'GENERAL' | 'PROJECT'; description?: string | null }

export default function TaskListsPage() {
  const [items, setItems] = useState<TaskList[]>([])
  const [name, setName] = useState('')
  const [tag, setTag] = useState<'GENERAL' | 'PROJECT'>('GENERAL')
  const [description, setDescription] = useState('')
  const [tagFilter, setTagFilter] = useState<'' | 'GENERAL' | 'PROJECT'>('')
  const { push } = useToast()

  async function load() {
    const qs = tagFilter ? `?tag=${tagFilter}` : ''
    const data = await apiGet<TaskList[]>(`/tasklists${qs}`)
    setItems(data)
  }
  useEffect(() => { load() }, [tagFilter])

  async function create() {
    try {
      await apiPost(`/tasklists`, { name, tag, description: description || undefined })
      setName('')
      setDescription('')
      push({ type: 'success', message: 'Task listesi oluşturuldu.' })
      await load()
    } catch (e: any) {
      push({ type: 'error', message: e?.error?.message || e.message })
    }
  }

  async function rename(id: string) {
    const newName = prompt('Yeni isim?')
    if (!newName) return
    try {
      await apiPatch(`/tasklists/${id}`, { name: newName })
      push({ type: 'success', message: 'Liste adı güncellendi.' })
      await load()
    } catch (e: any) {
      push({ type: 'error', message: e?.error?.message || e.message })
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Task Lists</h2>
      <div className="flex gap-2 mb-3 items-center flex-wrap">
        <select value={tagFilter} onChange={(e)=> setTagFilter(e.target.value as any)} className="border rounded-md px-3 py-2">
          <option value="">Tag: Any</option>
          <option value="GENERAL">General</option>
          <option value="PROJECT">Project</option>
        </select>
        <div className="flex items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Liste adı" className="border rounded-md px-3 py-2" />
        <select value={tag} onChange={(e) => setTag(e.target.value as any)} className="border rounded-md px-3 py-2">
          <option value="GENERAL">General</option>
          <option value="PROJECT">Project</option>
        </select>
        <input value={description} onChange={(e)=> setDescription(e.target.value)} placeholder="Açıklama (opsiyonel)" className="border rounded-md px-3 py-2 w-64" />
        <Button onClick={create}>Oluştur</Button>
        </div>
      </div>
      <ul className="grid gap-2">
        {items.map(tl => (
          <li key={tl.id} className="border rounded-md px-3 py-2 flex justify-between items-center">
            <a href={`/tasklists/${tl.id}`} className="no-underline text-slate-900">
              <div className="font-semibold flex items-center gap-2">
                {tl.name}
                <span className={`text-xs px-2 py-0.5 rounded-full ${tl.tag==='GENERAL'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>{tl.tag}</span>
              </div>
              {tl.description && <div className="text-xs text-slate-600">{tl.description}</div>}
            </a>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => rename(tl.id)}>Yeniden Adlandır</Button>
              <Button variant="secondary" onClick={async ()=>{
                if (!confirm('Bu task listesini silmek istediğinizden emin misiniz?')) return
                try { await apiDelete(`/tasklists/${tl.id}`); push({ type:'success', message:'Silindi' }); await load() } catch(e:any) { push({ type:'error', message: e?.error?.message || e.message }) }
              }}>Sil</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
