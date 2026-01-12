import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common'
import type { Request } from 'express'
import { MinRole } from '../security/roles.decorator'
import { Roles } from '../security/role.types'
import { ApiTags } from '@nestjs/swagger'
import { UsersService } from './users.service'

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  @MinRole(Roles.SALESPERSON)
  me(@Req() req: Request) {
    const user = (req as any).user ?? null
    return { user }
  }

  @Get()
  @MinRole(Roles.TEAM_LEADER)
  list(@Query('includeInactive') includeInactive?: string) {
    return this.users.list(includeInactive === '1' || includeInactive === 'true')
  }

  @Post()
  @MinRole(Roles.ADMIN)
  create(@Body() body: { email: string; name?: string; role?: string; password?: string; managerId?: string }) {
    return this.users.create(body)
  }

  @Patch(':id')
  @MinRole(Roles.ADMIN)
  update(@Param('id') id: string, @Body() body: any) {
    return this.users.update(id, body)
  }

  @Patch(':id/role')
  @MinRole(Roles.ADMIN)
  changeRole(@Param('id') id: string, @Body() body: { role: string; managerId?: string }) {
    return this.users.changeRole(id, body.role, body.managerId)
  }

  @Patch(':id/deactivate')
  @MinRole(Roles.ADMIN)
  deactivate(@Param('id') id: string) { return this.users.deactivate(id) }

  @Patch(':id/password')
  @MinRole(Roles.ADMIN)
  setPassword(@Param('id') id: string, @Body() body: { password: string }) { return this.users.setPassword(id, body.password) }
}
