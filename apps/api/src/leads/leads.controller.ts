import { Body, Controller, Get, Param, Post, Query, Patch, Delete } from '@nestjs/common'
import { MinRole } from '../security/roles.decorator'
import { Roles } from '../security/role.types'
import { LeadsService } from './leads.service'
import { LeadListQueryDto } from './dto/lead-list.dto'
import { LeadConvertDto, LeadLinkupDto } from './dto/lead-convert.dto'
import { ApiTags } from '@nestjs/swagger'
import { CreateLeadDto } from './dto/lead-create.dto'
import { UpdateLeadDto } from './dto/lead-update.dto'

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private svc: LeadsService) {}

  @Get()
  @MinRole(Roles.MANAGER)
  async list(@Query() q: LeadListQueryDto) {
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 20
    const from = q.from ? new Date(q.from) : undefined
    const to = q.to ? new Date(q.to) : undefined
    return this.svc.list({ from, to, skip: (page - 1) * pageSize, take: pageSize, status: q.status, source: q.source, search: q.search, city: q.city, district: q.district })
  }

  @Get('search')
  @MinRole(Roles.MANAGER)
  search(@Query('q') q?: string, @Query('take') take?: string) {
    return this.svc.search(q || '', take ? Number(take) : 10)
  }

  @Get(':id')
  @MinRole(Roles.MANAGER)
  detail(@Param('id') id: string) {
    return this.svc.detail(id)
  }

  @Get(':id/history')
  @MinRole(Roles.MANAGER)
  history(@Param('id') id: string) {
    return this.svc.history(id)
  }

  @Post('convert')
  @MinRole(Roles.MANAGER)
  convert(@Body() body: LeadConvertDto) {
    return this.svc.convert(body)
  }

  @Post('linkup')
  @MinRole(Roles.MANAGER)
  linkup(@Body() body: LeadLinkupDto) {
    return this.svc.linkup(body)
  }

  // Aliases with :id style for compatibility with prompt
  @Post(':id/convert')
  @MinRole(Roles.MANAGER)
  convertById(@Param('id') id: string, @Body() body: { account?: any }) {
    return this.svc.convert({ leadId: id, account: body?.account })
  }

  @Post(':id/linkup')
  @MinRole(Roles.MANAGER)
  linkupById(@Param('id') id: string, @Body() body: { accountId: string }) {
    return this.svc.linkup({ leadId: id, accountId: body.accountId })
  }

  @Post()
  @MinRole(Roles.MANAGER)
  create(@Body() body: CreateLeadDto) {
    return this.svc.create(body)
  }

  

  @Patch(':id')
  @MinRole(Roles.MANAGER)
  update(@Param('id') id: string, @Body() body: UpdateLeadDto) { return this.svc.update(id, body) }

  @Delete(':id')
  @MinRole(Roles.ADMIN)
  remove(@Param('id') id: string) { return this.svc.remove(id) }

  @Patch(':id/unlink')
  @MinRole(Roles.MANAGER)
  unlink(@Param('id') id: string) { return this.svc.unlink(id) }
}
