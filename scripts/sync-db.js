require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function sync() {
  console.log('Synchronizing schema with PostgreSQL...');

  // Ensure all columns exist
  await pool.query(`
    -- HotelSetting
    ALTER TABLE "HotelSetting" ADD COLUMN IF NOT EXISTS "city" TEXT DEFAULT 'Bhubaneswar';
    ALTER TABLE "HotelSetting" ADD COLUMN IF NOT EXISTS "state" TEXT DEFAULT 'Odisha';
    ALTER TABLE "HotelSetting" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'India';
    ALTER TABLE "HotelSetting" ADD COLUMN IF NOT EXISTS "website" TEXT;
    ALTER TABLE "HotelSetting" ADD COLUMN IF NOT EXISTS "gstNumber" TEXT;
    ALTER TABLE "HotelSetting" ADD COLUMN IF NOT EXISTS "invoiceTerms" TEXT DEFAULT 'Thank you for staying at DURGA LODGE. Government ID required at check-in. Standard checkout is 11:00 AM.';
    ALTER TABLE "HotelSetting" ADD COLUMN IF NOT EXISTS "allowNegativeBalanceCheckout" BOOLEAN DEFAULT false;

    -- RoomType
    ALTER TABLE "RoomType" ADD COLUMN IF NOT EXISTS "description" TEXT;
    ALTER TABLE "RoomType" ADD COLUMN IF NOT EXISTS "capacity" INTEGER DEFAULT 2;
    ALTER TABLE "RoomType" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "RoomType" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

    -- Room
    ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

    -- Booking
    ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "bookingNumber" TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS "Booking_bookingNumber_key" ON "Booking"("bookingNumber");
    ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_createdById_fkey') THEN
        ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;

    -- Payment
    ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "isRefund" BOOLEAN DEFAULT false;
    ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

    -- ExpenseCategory
    ALTER TABLE "ExpenseCategory" ADD COLUMN IF NOT EXISTS "description" TEXT;
    ALTER TABLE "ExpenseCategory" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

    -- Expense
    ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

    -- DailyClosing
    ALTER TABLE "DailyClosing" ADD COLUMN IF NOT EXISTS "upiCollected" INTEGER DEFAULT 0;
    ALTER TABLE "DailyClosing" ADD COLUMN IF NOT EXISTS "cardCollected" INTEGER DEFAULT 0;
    ALTER TABLE "DailyClosing" ADD COLUMN IF NOT EXISTS "bankCollected" INTEGER DEFAULT 0;
    ALTER TABLE "DailyClosing" ADD COLUMN IF NOT EXISTS "otherCollected" INTEGER DEFAULT 0;
    ALTER TABLE "DailyClosing" ADD COLUMN IF NOT EXISTS "totalRevenue" INTEGER DEFAULT 0;
    ALTER TABLE "DailyClosing" ADD COLUMN IF NOT EXISTS "totalExpenses" INTEGER DEFAULT 0;
    ALTER TABLE "DailyClosing" ADD COLUMN IF NOT EXISTS "netResult" INTEGER DEFAULT 0;
    ALTER TABLE "DailyClosing" ADD COLUMN IF NOT EXISTS "bookingsCreated" INTEGER DEFAULT 0;
    ALTER TABLE "DailyClosing" ADD COLUMN IF NOT EXISTS "checkInsCount" INTEGER DEFAULT 0;
    ALTER TABLE "DailyClosing" ADD COLUMN IF NOT EXISTS "checkOutsCount" INTEGER DEFAULT 0;
    ALTER TABLE "DailyClosing" ADD COLUMN IF NOT EXISTS "cancelledCount" INTEGER DEFAULT 0;
    ALTER TABLE "DailyClosing" ADD COLUMN IF NOT EXISTS "outstandingBalances" INTEGER DEFAULT 0;
    ALTER TABLE "DailyClosing" ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMP(3);
    ALTER TABLE "DailyClosing" ADD COLUMN IF NOT EXISTS "notes" TEXT;

    -- Index on AuditLog
    CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
    CREATE INDEX IF NOT EXISTS "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");
  `);

  console.log('✅ PostgreSQL schema successfully synchronized!');
  await pool.end();
}

sync().catch(err => {
  console.error('Error syncing schema:', err);
  process.exit(1);
});
