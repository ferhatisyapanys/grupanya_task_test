export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'

function isAbsolute(url: string) { return /^https?:\/\//i.test(url) }
function joinUrl(base: string, path: string) {
  if (isAbsolute(path)) return path
  if (!base.endsWith('/') && !path.startsWith('/')) return `${base}/${path}`
  if (base.endsWith('/') && path.startsWith('/')) return `${base}${path.slice(1)}`
  return `${base}${path}`
}

function devHeaders(role?: string) {
  if (typeof window !== 'undefined') {
    const uid = window.localStorage.getItem('userId') || window.localStorage.getItem('devUserId') || process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user'
    const urole = role || window.localStorage.getItem('userRole') || window.localStorage.getItem('devRole') || process.env.NEXT_PUBLIC_DEV_ROLE || 'MANAGER'
    const email = window.localStorage.getItem('userEmail') || window.localStorage.getItem('devUserEmail')
    return {
      'Content-Type': 'application/json',
      'x-user-id': uid,
      'x-user-role': urole,
      ...(email ? { 'x-user-email': email } : {}),
    }
  }
  return {
    'Content-Type': 'application/json',
    'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user',
    'x-user-role': role || (process.env.NEXT_PUBLIC_DEV_ROLE || 'MANAGER'),
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
  const url = joinUrl(API_BASE, path)
  let res: Response
  try {
    res = await f(url, {
      ...init,
      headers: { ...devHeaders(), ...(init?.headers || {}) },
      cache: 'no-store',
    })
  } catch (e: any) {
    throw new Error(`Failed to fetch: ${url} (${e?.message || 'network error'})`)
  }
  if (!res.ok) throw await res.json().catch(() => new Error(`${res.status} ${res.statusText}`))
  return res.json()
}

export async function apiPost<T>(path: string, body?: any, init?: RequestInit): Promise<T> {
  const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
  const url = joinUrl(API_BASE, path)
  let res: Response
  try {
    res = await f(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...init,
      headers: { ...devHeaders(), ...(init?.headers || {}) },
    })
  } catch (e: any) {
    throw new Error(`Failed to fetch: ${url} (${e?.message || 'network error'})`)
  }
  if (!res.ok) throw await res.json().catch(() => new Error(`${res.status} ${res.statusText}`))
  return res.json()
}

export async function apiPatch<T>(path: string, body?: any, init?: RequestInit): Promise<T> {
  const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
  const url = joinUrl(API_BASE, path)
  let res: Response
  try {
    res = await f(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...init,
      headers: { ...devHeaders(), ...(init?.headers || {}) },
    })
  } catch (e: any) {
    throw new Error(`Failed to fetch: ${url} (${e?.message || 'network error'})`)
  }
  if (!res.ok) throw await res.json().catch(() => new Error(`${res.status} ${res.statusText}`))
  return res.json()
}

export async function apiDelete<T = any>(path: string, init?: RequestInit): Promise<T> {
  const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
  const res = await f(`${API_BASE}${path}`, {
    method: 'DELETE',
    ...init,
    headers: { ...devHeaders(), ...(init?.headers || {}) },
  })
  if (!res.ok) throw await res.json().catch(() => new Error(res.statusText))
  return res.json()
}
