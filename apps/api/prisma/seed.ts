import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed users
  await prisma.user.upsert({ where: { email: 'admin@example.com' }, update: {}, create: { email: 'admin@example.com', name: 'Admin', role: 'ADMIN' as any } })
  await prisma.user.upsert({ where: { email: 'manager@example.com' }, update: {}, create: { email: 'manager@example.com', name: 'Manager', role: 'MANAGER' as any } })
  const tl = await prisma.user.upsert({ where: { email: 'lead@example.com' }, update: {}, create: { email: 'lead@example.com', name: 'Team Leader', role: 'TEAM_LEADER' as any } })
  const sp = await prisma.user.upsert({ where: { email: 'sales@example.com' }, update: {}, create: { email: 'sales@example.com', name: 'Sales', role: 'SALESPERSON' as any } })

  const lead1 = await prisma.lead.create({ data: { payload: { accountName: 'Demo Cafe', category: 'Food' } } })
  const lead2 = await prisma.lead.create({ data: { payload: { accountName: 'Test Spa', category: 'Wellness' } } })
  console.log({ lead1: lead1.id, lead2: lead2.id, teamLeader: tl.id, salesperson: sp.id })
}

main().finally(() => prisma.$disconnect())
