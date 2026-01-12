import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common'
import { PrismaService } from '../infrastructure/prisma/prisma.service'
import { AssignTaskDto, CreateTaskDto } from './dto/task-create.dto'
import { ActivityLogDto } from './dto/task-activity.dto'
import { GeneralStatus, TaskListTag, Reason } from '@prisma/client'
import { NotificationsService } from '../notifications/notifications.service'
import { AuditService } from '../audit/audit.service'

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService, @Optional() private notifications?: NotificationsService, @Optional() private audit?: AuditService) {}

  async detail(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, accountName: true } },
        logs: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 100 },
        offers: true,
      },
    })
    if (!task) throw new NotFoundException('Task not found')
    return task
  }

  async create(user: { id: string; role: string }, dto: CreateTaskDto) {
    const list = await this.prisma.taskList.findUnique({ where: { id: dto.taskListId } })
    if (!list) throw new NotFoundException('Task list not found')
    // Enforce type consistency with TaskList tag
    if ((list.tag as any) !== dto.type) {
      throw new BadRequestException('Task type must match the TaskList tag')
    }
    if (dto.ownerId) {
      const owner = await this.prisma.user.findUnique({ where: { id: dto.ownerId } })
      if (!owner || owner.role !== ('SALESPERSON' as any)) {
        throw new BadRequestException('Owner must be a SALESPERSON user')
      }
    }

    // General rule: if type is GENERAL, there must be no OPEN task for same account (in any list)
    if (dto.type === 'GENERAL') {
      const existingOpen = await this.prisma.task.findFirst({
        where: { accountId: dto.accountId, type: 'GENERAL', generalStatus: 'OPEN' },
      })
      if (existingOpen) throw new BadRequestException('This account already has an OPEN General task')
    }

    const task = await this.prisma.task.create({
      data: {
        taskListId: dto.taskListId,
        accountId: dto.accountId,
        ownerId: dto.ownerId ?? null,
        createdById: user.id,
        category: dto.category,
        type: dto.type,
        priority: dto.priority,
        accountType: dto.accountType,
        source: dto.source,
        mainCategory: dto.mainCategory,
        subCategory: dto.subCategory,
        contact: dto.contact,
        details: dto.details,
        city: (dto as any).city ?? null,
        district: (dto as any).district ?? null,
        durationDays: dto.durationDays ?? null,
        assignmentDate: dto.ownerId ? new Date() : null,
        dueDate: dto.ownerId && dto.durationDays ? new Date(Date.now() + dto.durationDays * 86400000) : null,
        status: (dto as any).status ?? 'NOT_HOT',
        generalStatus: (dto as any).generalStatus ?? 'OPEN',
      },
    })
    await this.audit?.log({ entityType: 'TASK', entityId: task.id, action: 'CREATE', userId: user.id, newData: task })

    await this.prisma.activityHistory.create({
      data: { accountId: dto.accountId, type: 'TASK_OPEN', summary: `Task ${task.id} opened by ${user.id}` },
    })

    // Notify owner if created as assigned
    if (task.ownerId) {
      const due = task.dueDate ? ` (due ${task.dueDate.toISOString().slice(0, 10)})` : ''
      await this.notifications?.createAndPublish({ taskId: task.id, toUserId: task.ownerId, message: `Task assigned to you${due}` })
    }

    return task
  }

  async list(filter: any, user?: { id: string; role: string }) {
    const where: any = {}
    if (filter.taskListId) where.taskListId = filter.taskListId
    if (filter.ownerId !== undefined) {
      if (filter.ownerId === 'null') where.ownerId = null
      else if (filter.ownerId) where.ownerId = filter.ownerId
    }
    if (filter.priority) where.priority = filter.priority
    if (filter.category) where.category = filter.category
    if (filter.accountType) where.accountType = filter.accountType
    if (filter.source) where.source = filter.source
    if (filter.mainCategory) where.mainCategory = { contains: String(filter.mainCategory), mode: 'insensitive' }
    if (filter.subCategory) where.subCategory = { contains: String(filter.subCategory), mode: 'insensitive' }
    if (filter.status) {
      const raw = (filter.status as any)
      let arr: string[] = []
      if (Array.isArray(raw)) arr = raw as string[]
      else if (typeof raw === 'string') arr = raw.split(',').map((s) => s.trim()).filter(Boolean)
      if (arr.length === 1) where.status = arr[0]
      else if (arr.length > 1) where.status = { in: arr as any }
    }
    if (filter.city) where.city = { contains: String(filter.city), mode: 'insensitive' }
    if (filter.district) where.district = { contains: String(filter.district), mode: 'insensitive' }
    if (filter.generalStatus) where.generalStatus = filter.generalStatus
    if (filter.createdFrom || filter.createdTo) {
      where.creationDate = {}
      if (filter.createdFrom) where.creationDate.gte = new Date(filter.createdFrom)
      if (filter.createdTo) where.creationDate.lte = new Date(filter.createdTo)
    }
    if (filter.q) {
      const q = String(filter.q)
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { account: { accountName: { contains: q, mode: 'insensitive' } } },
        { details: { contains: q, mode: 'insensitive' } },
      ]
    }
    // Scope by role
    if (user) {
      if (user.role === 'SALESPERSON') {
        where.ownerId = user.id
      } else if (user.role === 'MANAGER') {
        // If explicitly searching unassigned, allow it; else scope by manager
        if (!(where.ownerId === null)) {
          where.owner = { managerId: user.id } as any
        }
      } else {
        // ADMIN and others: no extra restriction
      }
    }

    const page = filter.page ? Number(filter.page) : undefined
    const limit = filter.limit ? Math.min(Number(filter.limit), 100) : undefined
    if (page && limit) {
      const skip = (page - 1) * limit
      const [items, total] = await this.prisma.$transaction([
        this.prisma.task.findMany({ where, orderBy: { creationDate: 'desc' }, take: limit, skip, include: { account: { select: { accountName: true } } } }),
        this.prisma.task.count({ where }),
      ])
      return { items, total, page, limit }
    }
    return this.prisma.task.findMany({ where, orderBy: { creationDate: 'desc' }, take: 50, include: { account: { select: { accountName: true } } } })
  }

  async search(q: string, take = 10) {
    const where: any = q ? {
      OR: [
        { id: { contains: q, mode: 'insensitive' } },
        { details: { contains: q, mode: 'insensitive' } },
        { account: { accountName: { contains: q, mode: 'insensitive' } } },
      ],
    } : {}
    const items = await this.prisma.task.findMany({ where, take, orderBy: { creationDate: 'desc' }, include: { account: { select: { accountName: true } } } })
    return items.map(t => ({ id: t.id, label: `${t.account?.accountName || t.accountId} • ${(t as any).externalRef || t.id}` }))
  }

  async assign(user: { id: string; role: string }, id: string, body: AssignTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id } })
    if (!task) throw new NotFoundException('Task not found')
    // Owner must be SALESPERSON
    const owner = await this.prisma.user.findUnique({ where: { id: body.ownerId } })
    if (!owner || owner.role !== ('SALESPERSON' as any)) {
      throw new BadRequestException('Owner must be a SALESPERSON user')
    }

    const assignmentDate = new Date()
    const dueDate = new Date(assignmentDate.getTime() + body.durationDays * 86400000)
    const updated = await this.prisma.task.update({
      where: { id },
      data: { ownerId: body.ownerId, durationDays: body.durationDays, assignmentDate, dueDate },
    })
    await this.audit?.log({ entityType: 'TASK', entityId: id, action: 'UPDATE', userId: user.id, previousData: task, newData: updated })

    await this.prisma.activityHistory.create({
      data: { accountId: task.accountId, type: 'PROFILE_UPDATE', summary: `Task ${task.id} assigned to ${body.ownerId}` },
    })
    // Notify the new owner
    if (updated.ownerId) {
      const due = updated.dueDate ? ` (due ${updated.dueDate.toISOString().slice(0, 10)})` : ''
      await this.notifications?.createAndPublish({ taskId: updated.id, toUserId: updated.ownerId, message: `Task assigned to you${due}` })
    }
    return updated
  }

  private ensureSalespersonOwns(user: { id: string; role: string }, task: { ownerId: string | null }) {
    if (user.role === 'SALESPERSON' && task.ownerId !== user.id) {
      throw new ForbiddenException('Only owner can update this task')
    }
  }

  async addActivity(user: { id: string; role: string }, id: string, dto: ActivityLogDto) {
    const task = await this.prisma.task.findUnique({ where: { id } })
    if (!task) throw new NotFoundException('Task not found')
    this.ensureSalespersonOwns(user, task)

    // Offer validation for certain reasons
    if ((dto.reason === 'TEKLIF_VERILDI' || dto.reason === 'KARSITEKLIF')) {
      if (dto.adFee == null || dto.commission == null || dto.joker == null) {
        throw new BadRequestException('Offer (adFee, commission, joker) is required for this reason')
      }
    }
    if (dto.reason === 'TEKRAR_ARANACAK' && !dto.followUpDate) {
      throw new BadRequestException('followUpDate is required for TEKRAR_ARANACAK')
    }

    const log = await this.prisma.activityLog.create({
      data: {
        taskId: id,
        authorId: user.id,
        reason: dto.reason as Reason,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
        text: dto.text,
      },
    })
    await this.audit?.log({ entityType: 'TASK', entityId: id, action: 'UPDATE', userId: user.id, newData: { activityLogId: log.id, reason: dto.reason } })

    if (dto.adFee != null || dto.commission != null || dto.joker != null) {
      const type = dto.reason === 'TEKLIF_VERILDI' ? 'OUR_OFFER' : (dto.reason === 'KARSITEKLIF' ? 'COUNTER_OFFER' : null)
      await this.prisma.offer.create({ data: { taskId: id, activityLogId: log.id, adFee: dto.adFee ?? null, commission: dto.commission ?? null, joker: dto.joker ?? null, type: (type as any) || null, status: 'PENDING' as any, createdById: user.id } })
    }
    // Update offer status when accepted/rejected
    if (dto.reason === 'TEKLIF_KABUL') {
      await this.prisma.offer.updateMany({ where: { taskId: id }, data: { status: 'ACCEPTED' as any } })
    }
    if (dto.reason === 'TEKLIF_RED') {
      await this.prisma.offer.updateMany({ where: { taskId: id }, data: { status: 'REJECTED' as any } })
    }
    return log
  }

  async setStatus(user: { id: string; role: string }, id: string, status: any, close?: boolean, closedReason?: string) {
    const task = await this.prisma.task.findUnique({ where: { id } })
    if (!task) throw new NotFoundException('Task not found')
    this.ensureSalespersonOwns(user, task)

    let generalStatus: GeneralStatus | undefined
    if (close) {
      if (!(status === 'DEAL' || status === 'COLD')) {
        throw new BadRequestException('Only DEAL or COLD tasks can be closed manually')
      }
      generalStatus = 'CLOSED'
    }

    const updated = await this.prisma.task.update({ where: { id }, data: { status, ...(generalStatus ? { generalStatus, closedAt: new Date(), closedReason: closedReason || null } : {}) } })
    await this.audit?.log({ entityType: 'TASK', entityId: id, action: 'UPDATE', userId: user.id, previousData: task, newData: updated })
    if (generalStatus === 'CLOSED') {
      await this.prisma.activityHistory.create({ data: { accountId: task.accountId, type: 'TASK_CLOSE', summary: `Task ${id} closed with status ${status}` } })
      // Notify owner on manual close
      if (task.ownerId) {
        await this.notifications?.createAndPublish({ taskId: id, toUserId: task.ownerId, message: `Task closed as ${status}` })
      }
    }
    return updated
  }

  async update(id: string, body: any) {
    const task = await this.prisma.task.findUnique({ where: { id } })
    if (!task) throw new NotFoundException('Task not found')
    const list = await this.prisma.taskList.findUnique({ where: { id: task.taskListId } })
    // If type change is requested, it must match the parent TaskList tag
    if (body.type !== undefined) {
      if (list && (list.tag as any) !== body.type) {
        throw new BadRequestException('Task type must match the TaskList tag')
      }
      // If switching to GENERAL and task is OPEN, enforce uniqueness across account
      if (body.type === 'GENERAL' && task.generalStatus === ('OPEN' as any)) {
        const existingOpen = await this.prisma.task.findFirst({ where: { accountId: task.accountId, type: 'GENERAL', generalStatus: 'OPEN', NOT: { id } } })
        if (existingOpen) throw new BadRequestException('This account already has an OPEN General task')
      }
    }
    const data: any = {}
    const fields = ['category','type','priority','accountType','source','mainCategory','subCategory','city','district','contact','details']
    for (const k of fields) if (body[k] !== undefined) data[k] = body[k]
    const updated = await this.prisma.task.update({ where: { id }, data })
    await this.audit?.log({ entityType: 'TASK', entityId: id, action: 'UPDATE', userId: undefined, previousData: task, newData: updated })
    return updated
  }

  async deleteActivity(user: { id: string; role: string }, taskId: string, logId: string) {
    const log = await this.prisma.activityLog.findUnique({ where: { id: logId } })
    if (!log || log.taskId !== taskId) throw new NotFoundException('Activity log not found')
    // Permission: Salesperson can delete only own logs; higher roles can delete any
    if (user.role === 'SALESPERSON' && log.authorId !== user.id) {
      throw new ForbiddenException('Only author can delete this log')
    }
    await this.prisma.$transaction([
      this.prisma.offer.deleteMany({ where: { activityLogId: logId } }),
      this.prisma.activityLog.delete({ where: { id: logId } }),
    ])
    await this.audit?.log({ entityType: 'TASK', entityId: taskId, action: 'UPDATE', userId: user.id, previousData: { deletedActivityLogId: logId } })
    return { ok: true }
  }
}
