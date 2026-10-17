// scripts/create-admin.js
/**
 * Durga Lodge HMS - Secure Production Admin Creator
 *
 * Usage:
 *   node scripts/create-admin.js <email> <password> [name]
 *
 * Example:
 *   node scripts/create-admin.js owner@durgalodge.com StrongPassword123! "Durga Owner"
 *
 * Or using environment variables:
 *   ADMIN_EMAIL=owner@durgalodge.com ADMIN_PASSWORD=StrongPassword123! node scripts/create-admin.js
 */

require('dotenv').config()
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function main() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL
  const password = process.argv[3] || process.env.ADMIN_PASSWORD
  const name = process.argv[4] || process.env.ADMIN_NAME || 'System Administrator'

  if (!email || !password) {
    console.error('❌ Error: Email and password are required.')
    console.log('\nUsage:')
    console.log('  node scripts/create-admin.js <email> <password> [name]')
    console.log('\nExample:')
    console.log('  node scripts/create-admin.js admin@durgalodge.com MySecurePassword123! "Durga Admin"')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters long for production security.')
    process.exit(1)
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL environment variable is not defined in .env')
    process.exit(1)
  }

  const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1') || connectionString.includes('sslmode=disable')
  const pool = new Pool({
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
  })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  console.log(`🔐 Creating or updating Administrator: ${email}...`)

  const salt = await bcrypt.genSalt(12)
  const passwordHash = await bcrypt.hash(password, salt)

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase().trim() },
    update: {
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      name,
    },
    create: {
      email: email.toLowerCase().trim(),
      passwordHash,
      name,
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log('✅ Admin user successfully created/updated:')
  console.log(`   - ID: ${user.id}`)
  console.log(`   - Name: ${user.name}`)
  console.log(`   - Email: ${user.email}`)
  console.log(`   - Role: ${user.role}`)
  console.log('\n🎉 You can now use these credentials to log in to the dashboard.')

  await prisma.$disconnect()
  await pool.end()
}

main().catch((err) => {
  console.error('❌ Failed to create admin user:', err)
  process.exit(1)
})
