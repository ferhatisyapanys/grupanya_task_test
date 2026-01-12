import { Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/prisma/prisma.service'

function toCsv(rows: any[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const esc = (v: any) => {
    if (v == null) return ''
    const s = String(v)
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  return [headers.join(','), ...rows.map(r => headers.map(h => esc((r as any)[h])).join(','))].join('\n')
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async summary() {
    const [leadCount, accountCount, openTasks, closedTasks, byStatus, dealsByStatus] = await this.prisma.$transaction([
      this.prisma.lead.count(),
      this.prisma.account.count(),
      this.prisma.task.count({ where: { generalStatus: 'OPEN' } }),
      this.prisma.task.count({ where: { generalStatus: 'CLOSED' } }),
      this.prisma.task.groupBy({ by: ['status'], _count: { status: true }, orderBy: { status: 'asc' } as any }),
      this.prisma.deal.groupBy({ by: ['status'], _count: { status: true } }),
    ])
    return {
      leads: leadCount,
      accounts: accountCount,
      tasks: { open: openTasks, closed: closedTasks, byStatus },
      deals: { byStatus: dealsByStatus },
    }
  }

  async tasksCsv(q: { ownerId?: string; status?: string; generalStatus?: string }) {
    const where: any = {}
    if (q.ownerId) where.ownerId = q.ownerId
    if (q.status) where.status = q.status as any
    if (q.generalStatus) where.generalStatus = q.generalStatus as any

    const rows = await this.prisma.task.findMany({
      where,
      include: { account: { select: { accountName: true } } },
      orderBy: { creationDate: 'desc' },
      take: 1000,
    })
    const shaped = rows.map(r => ({
      id: r.id,
      account: (r as any).account?.accountName ?? r.accountId,
      status: r.status,
      generalStatus: r.generalStatus,
      priority: r.priority,
      ownerId: r.ownerId ?? '',
      creationDate: r.creationDate.toISOString(),
      assignmentDate: r.assignmentDate?.toISOString() ?? '',
      dueDate: r.dueDate?.toISOString() ?? '',
      closedAt: (r as any).closedAt ? (r as any).closedAt.toISOString?.() || (r as any).closedAt : '',
      closedReason: (r as any).closedReason || '',
    }))
    return toCsv(shaped)
  }

  async accountsCsv(q: { status?: string; source?: string; type?: string }) {
    const where: any = {}
    if (q.status) where.status = q.status as any
    if (q.source) where.source = q.source as any
    if (q.type) where.type = q.type as any
    const rows = await this.prisma.account.findMany({ where, orderBy: { creationDate: 'desc' }, take: 1000 })
    const shaped = rows.map(r => ({
      id: r.id,
      accountName: r.accountName,
      businessName: r.businessName,
      status: r.status,
      source: r.source,
      type: r.type,
      category: r.category,
      creationDate: r.creationDate.toISOString(),
    }))
    return toCsv(shaped)
  }
}
