import { Controller, Get, Header, Query, Res } from '@nestjs/common'
import { Response } from 'express'
import { MinRole } from '../security/roles.decorator'
import { Roles } from '../security/role.types'
import { ReportsService } from './reports.service'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Get('summary')
  @MinRole(Roles.MANAGER)
  summary() {
    return this.svc.summary()
  }

  @Get('tasks.csv')
  @MinRole(Roles.MANAGER)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  tasksCsv(@Query() q: any, @Res() res: Response) {
    return this.svc.tasksCsv(q).then(csv => {
      res.setHeader('Content-Disposition', 'attachment; filename="tasks.csv"')
      res.send(csv)
    })
  }

  @Get('accounts.csv')
  @MinRole(Roles.MANAGER)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  accountsCsv(@Query() q: any, @Res() res: Response) {
    return this.svc.accountsCsv(q).then(csv => {
      res.setHeader('Content-Disposition', 'attachment; filename="accounts.csv"')
      res.send(csv)
    })
  }
}
