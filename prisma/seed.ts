// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting DB Seed...')

  // 1. Create Admin User
  const hashedPassword = await argon2.hash('admin123') // Force change on first login in real prod
  const admin = await prisma.user.upsert({
    where: { email: 'admin@durgalodge.com' },
    update: {},
    create: {
      email: 'admin@durgalodge.com',
      passwordHash: hashedPassword,
      name: 'System Admin',
      role: Role.ADMIN,
    },
  })
  console.log('✅ Admin user created')

  // 2. Create Hotel Settings
  await prisma.hotelSetting.upsert({
    where: { id: 'durga-lodge-settings' },
    update: {},
    create: {
      id: 'durga-lodge-settings',
      name: 'DURGA LODGE',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      taxPercentage: 1200, // 12.00% GST
    },
  })
  console.log('✅ Hotel settings created')

  // 3. Create Room Types
  const standardType = await prisma.roomType.create({
    data: {
      name: 'Standard Non-AC',
      baseTariff: 100000, // ₹1,000.00 in paise
      isAC: false,
      isAttachedBath: true,
    }
  })

  const premiumType = await prisma.roomType.create({
    data: {
      name: 'Premium AC',
      baseTariff: 180000, // ₹1,800.00 in paise
      isAC: true,
      isAttachedBath: true,
    }
  })
  console.log('✅ Room types created')

  // 4. Create the 16 Rooms for DURGA LODGE
  const floor1Rooms = ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '111', '112', '113', '114', '115']
  const floor2Rooms = ['201', '202', '203']

  for (const number of floor1Rooms) {
    await prisma.room.create({
      data: {
        number,
        floor: '1',
        typeId: standardType.id, // Defaulting floor 1 to standard, can be changed later
      }
    })
  }

  for (const number of floor2Rooms) {
    await prisma.room.create({
      data: {
        number,
        floor: '2',
        typeId: premiumType.id, // Defaulting floor 2 to premium
      }
    })
  }
  console.log('✅ 16 Rooms created for DURGA LODGE')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })