export type FetchLike = (input: RequestInfo, init?: RequestInit) => Promise<Response>

export interface SdkOptions {
  baseUrl?: string
  fetch?: FetchLike
  headers?: Record<string, string>
}

export class GrupanyaSDK {
  private base: string
  private fetcher: FetchLike
  private headers: Record<string, string>

  constructor(opts: SdkOptions = {}) {
    this.base = (opts.baseUrl || 'http://localhost:3001/api').replace(/\/$/, '')
    const rawFetch: any = opts.fetch || (typeof window !== 'undefined' ? (window as any).fetch : (globalThis as any).fetch)
    // Some runtimes require the global `this` bound for fetch (Illegal invocation)
    this.fetcher = rawFetch && rawFetch.bind ? rawFetch.bind(typeof window !== 'undefined' ? window : globalThis) : rawFetch
    this.headers = opts.headers || {}
  }

  private qs(params?: Record<string, any>) {
    if (!params) return ''
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue
      clean[k] = String(v)
    }
    const usp = new URLSearchParams(clean).toString()
    return usp ? `?${usp}` : ''
  }

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetcher(`${this.base}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...this.headers, ...(init?.headers || {}) } })
    if (!res.ok) throw await res.json().catch(() => new Error(res.statusText))
    return res.json()
  }

  // Root/Users
  health() { return this.json('/health') }
  me() { return this.json('/users/me') }
  usersList() { return this.json('/users') }

  // Leads
  leadsList(params?: Record<string, any>) { return this.json(`/leads${this.qs(params)}`) }
  leadDetail(id: string) { return this.json(`/leads/${id}`) }
  leadHistory(id: string) { return this.json(`/leads/${id}/history`) }
  leadCreate(body: any) { return this.json('/leads', { method: 'POST', body: JSON.stringify(body) }) }
  leadUpdate(id: string, body: any) { return this.json(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) }) }
  leadConvert(body: { leadId: string; account?: any }) { return this.json('/leads/convert', { method: 'POST', body: JSON.stringify(body) }) }
  leadLinkup(body: { leadId: string; accountId: string }) { return this.json('/leads/linkup', { method: 'POST', body: JSON.stringify(body) }) }

  // Accounts
  accountsList(params?: Record<string, any>) { return this.json(`/accounts${this.qs(params)}`) }
  accountDetail(id: string) { return this.json(`/accounts/${id}`) }
  accountCreate(body: any) { return this.json('/accounts', { method: 'POST', body: JSON.stringify(body) }) }
  accountUpdate(id: string, body: any) { return this.json(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }) }
  accountActivityHistory(id: string) { return this.json(`/accounts/${id}/activity-history`) }
  accountDealHistory(id: string) { return this.json(`/accounts/${id}/deal-history`) }
  accountTaskHistory(id: string) { return this.json(`/accounts/${id}/task-history`) }
  // Account contacts
  accountContacts(id: string) { return this.json(`/accounts/${id}/contacts`) }
  accountCreateContact(id: string, body: any) { return this.json(`/accounts/${id}/contacts`, { method: 'POST', body: JSON.stringify(body) }) }
  accountUpdateContact(id: string, contactId: string, body: any) { return this.json(`/accounts/${id}/contacts/${contactId}`, { method: 'PATCH', body: JSON.stringify(body) }) }
  accountDeleteContact(id: string, contactId: string) { return this.json(`/accounts/${id}/contacts/${contactId}`, { method: 'DELETE' }) }
  // Account notes
  accountNotes(id: string) { return this.json(`/accounts/${id}/notes`) }
  accountCreateNote(id: string, content: string) { return this.json(`/accounts/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }) }) }
  accountDeleteNote(id: string, noteId: string) { return this.json(`/accounts/${id}/notes/${noteId}`, { method: 'DELETE' }) }

  // TaskLists
  tasklists(params?: { tag?: 'GENERAL' | 'PROJECT' }) { return this.json(`/tasklists${this.qs(params as any)}`) }
  tasklistDetail(id: string) { return this.json(`/tasklists/${id}`) }
  tasklistCreate(body: any) { return this.json('/tasklists', { method: 'POST', body: JSON.stringify(body) }) }
  tasklistUpdate(id: string, body: any) { return this.json(`/tasklists/${id}`, { method: 'PATCH', body: JSON.stringify(body) }) }
  tasklistDelete(id: string) { return this.json(`/tasklists/${id}`, { method: 'DELETE' }) }

  // Tasks
  tasksList(params?: Record<string, any>) { return this.json(`/tasks${this.qs(params)}`) }
  taskDetail(id: string) { return this.json(`/tasks/${id}`) }
  taskCreate(body: any) { return this.json('/tasks', { method: 'POST', body: JSON.stringify(body) }) }
  taskAssign(id: string, body: any) { return this.json(`/tasks/${id}/assign`, { method: 'POST', body: JSON.stringify(body) }) }
  taskActivity(id: string, body: any) { return this.json(`/tasks/${id}/activity`, { method: 'POST', body: JSON.stringify(body) }) }
  taskDeleteActivity(taskId: string, logId: string) { return this.json(`/tasks/${taskId}/activity/${logId}`, { method: 'DELETE' }) }
  taskSetStatus(id: string, body: any) { return this.json(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }) }
  taskContacts(taskId: string) { return this.json(`/tasks/${taskId}/contacts`) }
  taskAddContact(taskId: string, body: any) { return this.json(`/tasks/${taskId}/contacts`, { method: 'POST', body: JSON.stringify(body) }) }
  taskUpdateContact(taskId: string, id: string, body: any) { return this.json(`/tasks/${taskId}/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }) }
  taskDeleteContact(taskId: string, id: string) { return this.json(`/tasks/${taskId}/contacts/${id}`, { method: 'DELETE' }) }

  // Notifications
  myNotifications() { return this.json('/notifications/me') }
  readNotification(id: string) { return this.json(`/notifications/${id}/read`, { method: 'PATCH' }) }

  // Reports
  summary() { return this.json('/reports/summary') }

  // Deals
  dealsList(params?: { accountId?: string; taskId?: string; page?: number; limit?: number }) { return this.json(`/deals${this.qs(params as any)}`) }
  dealDetail(id: string) { return this.json(`/deals/${id}`) }
  dealCreate(body: any) { return this.json('/deals', { method: 'POST', body: JSON.stringify(body) }) }
  dealUpdate(id: string, body: any) { return this.json(`/deals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }) }
  dealSetStatus(id: string, status: string) { return this.json(`/deals/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }) }
}
