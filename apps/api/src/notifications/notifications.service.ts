import { Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/prisma/prisma.service'
import { NotificationStreamService } from './stream.service'

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService, private stream: NotificationStreamService) {}

  listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { toUserId: userId },
      orderBy: { id: 'desc' },
      take: 50,
    })
  }

  markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } })
  }

  async createAndPublish(data: { taskId: string; toUserId: string; message: string }) {
    const n = await this.prisma.notification.create({ data })
    this.stream.publish(data.toUserId, { id: n.id, message: n.message, taskId: n.taskId })
    return n
  }
}
