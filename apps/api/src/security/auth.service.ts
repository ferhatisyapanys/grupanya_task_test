import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../infrastructure/prisma/prisma.service'
import { comparePassword, hashPassword, signToken } from './token.util'

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials')
    const ok = await comparePassword(password, (user as any).password)
    if (!ok) throw new UnauthorizedException('Invalid credentials')
    const accessToken = signToken({ sub: user.id, role: user.role }, { expiresInSec: 15 * 60 })
    const refreshToken = signToken({ sub: user.id, type: 'refresh' }, { expiresInSec: 7 * 24 * 3600 })
    const exp = new Date(Date.now() + 7 * 24 * 3600 * 1000)
    await this.prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt: exp } })
    return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } }
  }

  async refresh(refreshToken: string) {
    const rec = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken } })
    if (!rec || rec.expiresAt < new Date()) throw new UnauthorizedException('Invalid refresh token')
    const user = await this.prisma.user.findUnique({ where: { id: rec.userId } })
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid user')
    const accessToken = signToken({ sub: user.id, role: user.role }, { expiresInSec: 15 * 60 })
    return { accessToken }
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
    return { ok: true }
  }

  // Utility for seeding a password (optional)
  async setPassword(userId: string, newPassword: string) {
    const hashed = await hashPassword(newPassword)
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } as any })
    return { ok: true }
  }
}

