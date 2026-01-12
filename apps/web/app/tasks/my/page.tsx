import { redirect } from 'next/navigation'

export default function MyTasksPage() {
  redirect('/tasks?own=1')
}

