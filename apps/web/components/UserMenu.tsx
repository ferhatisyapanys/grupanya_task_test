"use client"
import { useEffect, useState } from 'react'

export default function UserMenu() {
  const [email, setEmail] = useState<string>("")
  const [role, setRole] = useState<string>("")

  useEffect(() => {
    if (typeof window === 'undefined') return
    const em = window.localStorage.getItem('userEmail') || window.localStorage.getItem('devUserEmail') || ''
    const rl = window.localStorage.getItem('userRole') || window.localStorage.getItem('devRole') || ''
    setEmail(em)
    setRole(rl)
  }, [])

  function logout() {
    if (typeof window === 'undefined') return
    const keys = ['accessToken','refreshToken','userId','userEmail','userRole','devUserId','devUserEmail','devRole']
    for (const k of keys) window.localStorage.removeItem(k)
    window.location.href = '/login'
  }

  return (
    <div className="flex items-center gap-3">
      {(role || email) && (
        <div className="text-xs text-slate-600">
          {email ? <span>{email}</span> : null}{role ? <span className="ml-2">({role})</span> : null}
        </div>
      )}
      <button onClick={logout} className="border rounded-md px-2 py-1 text-sm">Çıkış</button>
    </div>
  )
}

