import { Controller, Get, Param, Patch, Req } from '@nestjs/common'
import type { Request } from 'express'
import { MinRole } from '../security/roles.decorator'
import { Roles } from '../security/role.types'
import { NotificationsService } from './notifications.service'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get('me')
  @MinRole(Roles.SALESPERSON)
  list(@Req() req: Request) {
    const user = (req as any).user
    return this.svc.listForUser(user.id)
  }

  @Patch(':id/read')
  @MinRole(Roles.SALESPERSON)
  read(@Param('id') id: string) {
    return this.svc.markRead(id)
  }
}
