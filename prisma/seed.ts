import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const hrExpertiseAreas = [
  "Talent Acquisition",
  "Employee Relations",
  "Compensation & Benefits",
  "HRIS & Technology",
  "Learning & Development",
  "Organizational Development",
  "DEI (Diversity, Equity & Inclusion)",
  "HR Strategy & Business Partnership",
  "Performance Management",
  "HR Analytics & Reporting",
  "Compliance & Legal",
  "Global & International HR",
  "Change Management",
  "Workforce Planning",
  "Mergers & Acquisitions (M&A)"
]

async function main() {
  console.log('Seeding database...')

  // 1. Seed HR Expertise Areas
  for (const name of hrExpertiseAreas) {
    await prisma.hRExpertise.upsert({
      where: { name },
      update: {},
      create: { name }
    })
  }
  console.log('HR Expertise areas seeded.')

  // 2. Seed Default Admin User
  const adminEmail = 'admin@global-hrm.net'
  const adminPassword = 'AdminPass123!' // Default fallback password
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      fullName: 'Default Admin',
      password: hashedPassword,
      role: 'admin',
      accountStatus: 'active',
      emailVerified: true
    }
  })
  console.log(`Default admin user seeded: ${adminEmail} (password: ${adminPassword})`)

  // 3. Seed Global Config
  await prisma.globalConfig.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      logoUrl: ''
    }
  })
  console.log('Global configuration table seeded.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
