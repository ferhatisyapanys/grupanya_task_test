import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { DealsService } from './deals.service'
import { MinRole } from '../security/roles.decorator'
import { Roles } from '../security/role.types'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('deals')
@Controller('deals')
export class DealsController {
  constructor(private svc: DealsService) {}

  @Get()
  @MinRole(Roles.SALESPERSON)
  list(@Query('accountId') accountId?: string, @Query('taskId') taskId?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.list({ accountId, taskId, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined })
  }

  @Get(':id')
  @MinRole(Roles.SALESPERSON)
  detail(@Param('id') id: string) { return this.svc.detail(id) }

  @Post()
  @MinRole(Roles.MANAGER)
  create(@Body() body: { accountId: string; taskId?: string; title: string; startDate: string; endDate: string; value?: number; status?: string }) { return this.svc.create(body) }

  @Patch(':id')
  @MinRole(Roles.MANAGER)
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body) }

  @Patch(':id/status')
  @MinRole(Roles.MANAGER)
  setStatus(@Param('id') id: string, @Body() body: { status: string }) { return this.svc.setStatus(id, body.status) }
}

