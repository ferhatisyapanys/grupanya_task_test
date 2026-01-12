import { Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly svc: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    if (!body?.email || !body?.password) throw new UnauthorizedException('Missing credentials')
    return this.svc.login(body.email, body.password)
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    if (!body?.refreshToken) throw new UnauthorizedException('Missing refresh token')
    return this.svc.refresh(body.refreshToken)
  }

  @Post('logout')
  logout(@Body() body: { refreshToken: string }) {
    if (!body?.refreshToken) throw new UnauthorizedException('Missing refresh token')
    return this.svc.logout(body.refreshToken)
  }

  @Get('me')
  me(@Req() req: Request) {
    const user = (req as any).user
    return { user }
  }
}

