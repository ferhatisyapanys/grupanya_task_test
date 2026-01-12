import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { TasksService } from '../src/tasks/tasks.service'
import { TaskListTag } from '@prisma/client'

function mockPrisma(overrides: any = {}) {
  return {
    taskList: { findUnique: jest.fn() },
    task: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    activityHistory: { create: jest.fn() },
    activityLog: { create: jest.fn() },
    offer: { create: jest.fn() },
    $transaction: jest.fn((arr: any[]) => Promise.all(arr)),
    ...overrides,
  }
}

describe('TasksService business rules', () => {
  test('prevents multiple OPEN General tasks for same account', async () => {
    const prisma = mockPrisma()
    prisma.taskList.findUnique.mockResolvedValue({ id: 'tl', tag: TaskListTag.GENERAL })
    prisma.task.findFirst.mockResolvedValue({ id: 'existing' })
    const svc = new TasksService(prisma as any)

    await expect(
      svc.create({ id: 'u', role: 'TEAM_LEADER' }, {
        taskListId: 'tl', accountId: 'acc1', ownerId: undefined,
        category: 'ISTANBUL_CORE', type: 'GENERAL', priority: 'MEDIUM',
        accountType: 'LONG_TAIL', source: 'QUERY', mainCategory: 'Gen', subCategory: 'Gen', details: 'x',
      } as any)
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  test('allows task creation for Project lists even if General exists', async () => {
    const prisma = mockPrisma()
    prisma.taskList.findUnique.mockResolvedValue({ id: 'tl', tag: TaskListTag.PROJECT })
    prisma.task.findFirst.mockResolvedValue(null)
    prisma.task.create.mockResolvedValue({ id: 'new', accountId: 'acc1' })
    const svc = new TasksService(prisma as any)
    const res = await svc.create({ id: 'u', role: 'TEAM_LEADER' }, {
      taskListId: 'tl', accountId: 'acc1',
      category: 'ISTANBUL_CORE', type: 'GENERAL', priority: 'MEDIUM', accountType: 'LONG_TAIL', source: 'QUERY', mainCategory: 'Gen', subCategory: 'Gen', details: 'x',
    } as any)
    expect(res.id).toBe('new')
  })

  test('offer required for TEKLIF_VERILDI', async () => {
    const prisma = mockPrisma()
    prisma.task.findUnique.mockResolvedValue({ id: 't1', ownerId: 'owner1', accountId: 'acc1' })
    const svc = new TasksService(prisma as any)
    await expect(
      svc.addActivity({ id: 'owner1', role: 'SALESPERSON' }, 't1', { reason: 'TEKLIF_VERILDI' } as any)
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  test('followUpDate required for TEKRAR_ARANACAK', async () => {
    const prisma = mockPrisma()
    prisma.task.findUnique.mockResolvedValue({ id: 't1', ownerId: 'owner1', accountId: 'acc1' })
    const svc = new TasksService(prisma as any)
    await expect(
      svc.addActivity({ id: 'owner1', role: 'SALESPERSON' }, 't1', { reason: 'TEKRAR_ARANACAK' } as any)
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  test('salesperson cannot act on others\' tasks', async () => {
    const prisma = mockPrisma()
    prisma.task.findUnique.mockResolvedValue({ id: 't1', ownerId: 'owner1', accountId: 'acc1' })
    const svc = new TasksService(prisma as any)
    await expect(
      svc.addActivity({ id: 'u2', role: 'SALESPERSON' }, 't1', { reason: 'YETKILIYE_ULASILDI' } as any)
    ).rejects.toBeInstanceOf(ForbiddenException)
  })
})

