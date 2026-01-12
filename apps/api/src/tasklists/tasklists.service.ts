import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../infrastructure/prisma/prisma.service'
import { CreateTaskListDto, TaskListQueryDto, UpdateTaskListDto } from './dto/tasklist.dto'

@Injectable()
export class TaskListsService {
  constructor(private prisma: PrismaService) {}

  list(q: TaskListQueryDto) {
    return this.prisma.taskList.findMany({
      where: q.tag ? { tag: q.tag } : undefined,
      orderBy: { name: 'asc' },
    })
  }

  create(userId: string, dto: CreateTaskListDto) {
    return this.prisma.taskList.create({ data: { name: dto.name, tag: dto.tag, createdBy: userId, createdById: userId, description: dto.description ?? null } })
  }

  async detail(id: string) {
    const item = await this.prisma.taskList.findUnique({ where: { id } })
    if (!item) throw new NotFoundException('TaskList not found')
    return item
  }

  async update(id: string, dto: UpdateTaskListDto) {
    const exists = await this.prisma.taskList.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException('TaskList not found')
    const data: any = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.tag !== undefined) data.tag = dto.tag
    if (dto.description !== undefined) data.description = dto.description
    if (dto.isActive !== undefined) data.isActive = dto.isActive
    return this.prisma.taskList.update({ where: { id }, data })
  }

  async remove(id: string) {
    const exists = await this.prisma.taskList.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException('TaskList not found')
    await this.prisma.taskList.delete({ where: { id } })
    return { ok: true }
  }
}
