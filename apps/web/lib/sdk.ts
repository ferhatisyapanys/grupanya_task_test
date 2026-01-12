import { GrupanyaSDK } from '@grupanya/sdk'

export function getSdk() {
  const boundFetch = (typeof window !== 'undefined'
    ? (window.fetch && window.fetch.bind ? window.fetch.bind(window) : window.fetch)
    : (globalThis as any).fetch && (globalThis as any).fetch.bind
      ? (globalThis as any).fetch.bind(globalThis)
      : (globalThis as any).fetch)

  // Inject Authorization header if token present
  function toHeaderObject(h?: HeadersInit): Record<string, string> {
    const out: Record<string, string> = {}
    if (!h) return out
    if (typeof (h as any).forEach === 'function') {
      ;(h as Headers).forEach((v, k) => { out[k] = v })
      return out
    }
    if (Array.isArray(h)) {
      for (const [k, v] of h as Array<[string, string]>) out[k] = v
      return out
    }
    return { ...(h as Record<string, string>) }
  }

  const authy: typeof fetch = async (input: RequestInfo, init?: RequestInit) => {
    const headers = toHeaderObject(init?.headers)
    if (typeof window !== 'undefined') {
      const tok = window.localStorage.getItem('accessToken')
      if (tok) headers['Authorization'] = `Bearer ${tok}`
      const uid = window.localStorage.getItem('userId') || window.localStorage.getItem('devUserId')
      const uemail = window.localStorage.getItem('userEmail') || window.localStorage.getItem('devUserEmail')
      const urole = window.localStorage.getItem('userRole') || window.localStorage.getItem('devRole')
      if (uid) headers['x-user-id'] = uid
      if (uemail) headers['x-user-email'] = uemail
      if (urole) headers['x-user-role'] = urole
    }
    return boundFetch(input, { ...(init || {}), headers })
  }

  const sdk = new GrupanyaSDK({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api',
    fetch: authy as any,
    headers: {
      // Defaults; authy() will override from localStorage when present
      'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user',
      'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'MANAGER',
    },
  })

  // Ensure delete activity is available even if local SDK build is stale
  ;(sdk as any).taskDeleteActivity = async (taskId: string, logId: string) => {
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
    const res = await (authy as any)(`${base}/tasks/${taskId}/activity/${logId}`, { method: 'DELETE' })
    if (!res.ok) throw await res.json().catch(() => new Error(res.statusText))
    return res.json()
  }

  // Ensure leadUpdate exists even if local SDK build is stale
  ;(sdk as any).leadUpdate = async (id: string, body: any) => {
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
    const res = await (authy as any)(`${base}/leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) throw await res.json().catch(() => new Error(res.statusText))
    return res.json()
  }

  return sdk
}
