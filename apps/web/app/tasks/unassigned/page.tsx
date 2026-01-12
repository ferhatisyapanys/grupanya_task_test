import { redirect } from 'next/navigation'

export default function UnassignedTasksPage() {
  redirect('/tasks?unassigned=1')
}

