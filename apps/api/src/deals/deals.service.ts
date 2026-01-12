import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../infrastructure/prisma/prisma.service'

@Injectable()
export class DealsService {
  constructor(private prisma: PrismaService) {}

  async create(body: { accountId: string; taskId?: string; title: string; startDate: string; endDate: string; value?: number; status?: string }) {
    const account = await this.prisma.account.findUnique({ where: { id: body.accountId } })
    if (!account) throw new NotFoundException('Account not found')
    const data: any = {
      accountId: body.accountId,
      taskId: body.taskId || null,
      title: body.title,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      status: body.status || 'ACTIVE',
      value: body.value ?? null,
    }
    const deal = await this.prisma.deal.create({ data })
    await this.prisma.dealHistory.create({ data: { dealId: deal.id, action: 'CREATED' as any, newValue: deal as any } })
    return deal
  }

  async detail(id: string) {
    const d = await this.prisma.deal.findUnique({ where: { id }, include: { histories: { orderBy: { createdAt: 'desc' } } } })
    if (!d) throw new NotFoundException('Deal not found')
    return d
  }

  async list(q: { accountId?: string; taskId?: string; page?: number; limit?: number }) {
    const where: any = {}
    if (q.accountId) where.accountId = q.accountId
    if (q.taskId) where.taskId = q.taskId
    const page = Number(q.page || 1)
    const limit = Math.min(Number(q.limit || 20), 100)
    const skip = (page - 1) * limit
    const [items, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({ where, orderBy: { startDate: 'desc' }, take: limit, skip }),
      this.prisma.deal.count({ where }),
    ])
    return { items, total, page, limit }
  }

  async update(id: string, body: Partial<{ title: string; startDate: string; endDate: string; value?: number; status?: string; lastSalespersonId?: string }>) {
    const deal = await this.prisma.deal.findUnique({ where: { id } })
    if (!deal) throw new NotFoundException('Deal not found')
    const prev = deal
    const data: any = {}
    if (body.title !== undefined) data.title = body.title
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate)
    if (body.endDate !== undefined) data.endDate = new Date(body.endDate)
    if (body.value !== undefined) data.value = body.value
    if (body.status !== undefined) data.status = body.status
    if (body.lastSalespersonId !== undefined) data.lastSalespersonId = body.lastSalespersonId
    const updated = await this.prisma.deal.update({ where: { id }, data })
    await this.prisma.dealHistory.create({ data: { dealId: id, action: 'UPDATED' as any, previousValue: prev as any, newValue: updated as any } })
    return updated
  }

  async setStatus(id: string, status: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } })
    if (!deal) throw new NotFoundException('Deal not found')
    const updated = await this.prisma.deal.update({ where: { id }, data: { status } })
    await this.prisma.dealHistory.create({ data: { dealId: id, action: 'STATUS_CHANGED' as any, previousValue: { status: deal.status } as any, newValue: { status } as any } })
    return updated
  }
}

