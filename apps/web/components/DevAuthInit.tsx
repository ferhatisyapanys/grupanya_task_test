"use client"
import { useEffect } from 'react'

export default function DevAuthInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    // In dev: ensure we have some identity to hit API middleware
    if (process.env.NODE_ENV !== 'production') {
      const hasUser = !!(window.localStorage.getItem('userId') || window.localStorage.getItem('devUserId'))
      if (!hasUser) {
        window.localStorage.setItem('devUserId', 'dev-user')
        window.localStorage.setItem('devRole', (process.env.NEXT_PUBLIC_DEV_ROLE || 'MANAGER'))
      }
    }
  }, [])
  return null
}

