export const metadata = {
  title: 'Task Yönetim Modülü',
  description: 'Grupanya internal task management',
}

import NotificationsBell from '../components/NotificationsBell'
import GlobalSearch from '../components/GlobalSearch'
import { ToastProvider } from '../components/Toaster'
import '../styles/globals.css'
import dynamic from 'next/dynamic'

const UserMenu = dynamic(() => import('../components/UserMenu'), { ssr: false })
const DevAuthInit = dynamic(() => import('../components/DevAuthInit'), { ssr: false })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body style={{ fontFamily: 'ui-sans-serif, system-ui' }}>
        <ToastProvider>
          <DevAuthInit />
          <header className="border-b flex flex-wrap items-center gap-4 px-4 py-3">
            <a href="/" className="flex items-center gap-3">
              <img src="/grupanya-logo-2020.svg" alt="Grupanya" className="h-7 w-auto"/>
              <span className="sr-only">Task Yönetim Modülü</span>
            </a>
            <nav className="flex flex-wrap gap-3 text-slate-900">
              <a href="/">Ana Sayfa</a>
              <a href="/leads">Leads</a>
              <a href="/accounts">Accounts</a>
              <a href="/tasklists">Task Lists</a>
              <a href="/tasks">Tasks</a>
              <a href="/tasks/new">Create Task</a>
              <a href="/reports">Reports</a>
              <a href="/users">Users</a>
            </nav>
            <div className="flex-1 min-w-[220px]" />
            <GlobalSearch />
            <NotificationsBell />
            <UserMenu />
          </header>
          <main className="p-4 max-w-6xl mx-auto">{children}</main>
        </ToastProvider>
      </body>
    </html>
  )
}
