// scripts/seed.js
require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const connectionString = process.env.DATABASE_URL || 'postgresql://admin:secure_password_here@localhost:5432/durga_lodge';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting DURGA LODGE Database Seeding...');

  // 1. Create Users
  const password = await argon2.hash('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@durgalodge.com' },
    update: {},
    create: {
      email: 'admin@durgalodge.com',
      passwordHash: password,
      name: 'Durga Admin',
      role: 'ADMIN',
    },
  });

  const managerPass = await argon2.hash('manager123');
  const manager = await prisma.user.upsert({
    where: { email: 'manager@durgalodge.com' },
    update: {},
    create: {
      email: 'manager@durgalodge.com',
      passwordHash: managerPass,
      name: 'Rajesh Manager',
      role: 'MANAGER',
    },
  });

  const receptionPass = await argon2.hash('reception123');
  const reception = await prisma.user.upsert({
    where: { email: 'reception@durgalodge.com' },
    update: {},
    create: {
      email: 'reception@durgalodge.com',
      passwordHash: receptionPass,
      name: 'Sunita FrontDesk',
      role: 'RECEPTION',
    },
  });

  const staffPass = await argon2.hash('staff123');
  await prisma.user.upsert({
    where: { email: 'staff@durgalodge.com' },
    update: {},
    create: {
      email: 'staff@durgalodge.com',
      passwordHash: staffPass,
      name: 'Ramesh Housekeeping',
      role: 'STAFF',
    },
  });
  console.log('✅ 4 Users seeded (Admin, Manager, Reception, Staff)');

  // 2. Hotel Settings
  await prisma.hotelSetting.upsert({
    where: { id: 'durga-lodge-settings' },
    update: {
      name: 'DURGA LODGE',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      taxPercentage: 1200, // 12% GST
      address: 'Near Old Bus Stand, Station Road, Main Market',
      city: 'Bhubaneswar',
      state: 'Odisha',
      country: 'India',
      phone: '+91 94370 12345',
      email: 'stay@durgalodge.in',
      gstNumber: '21AAAAA0000A1Z5',
      checkInTime: '12:00',
      checkOutTime: '11:00',
      invoiceTerms: 'Thank you for choosing DURGA LODGE. Valid Government Photo ID is required at check-in. Standard checkout time is 11:00 AM.',
    },
    create: {
      id: 'durga-lodge-settings',
      name: 'DURGA LODGE',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      taxPercentage: 1200,
      address: 'Near Old Bus Stand, Station Road, Main Market',
      city: 'Bhubaneswar',
      state: 'Odisha',
      country: 'India',
      phone: '+91 94370 12345',
      email: 'stay@durgalodge.in',
      gstNumber: '21AAAAA0000A1Z5',
      checkInTime: '12:00',
      checkOutTime: '11:00',
      invoiceTerms: 'Thank you for choosing DURGA LODGE. Valid Government Photo ID is required at check-in. Standard checkout time is 11:00 AM.',
    },
  });
  console.log('✅ Hotel settings configured');

  // 3. Room Types
  const roomTypesData = [
    { name: 'Standard Non-AC', baseTariff: 100000, capacity: 2, isAC: false, isAttachedBath: true, description: 'Budget comfortable room with fan and attached bath' },
    { name: 'Standard AC', baseTariff: 140000, capacity: 2, isAC: true, isAttachedBath: true, description: 'Cozy climate-controlled room with LED TV and geyser' },
    { name: 'Premium AC', baseTariff: 180000, capacity: 3, isAC: true, isAttachedBath: true, description: 'Spacious AC room with king bed, desk, and tea maker' },
    { name: 'Deluxe Family Suite', baseTariff: 250000, capacity: 4, isAC: true, isAttachedBath: true, description: 'Double queen beds with lounge seating and mini fridge' },
  ];

  const roomTypeMap = {};
  for (const rt of roomTypesData) {
    const existing = await prisma.roomType.findFirst({ where: { name: rt.name } });
    if (existing) {
      roomTypeMap[rt.name] = existing;
    } else {
      const created = await prisma.roomType.create({ data: rt });
      roomTypeMap[rt.name] = created;
    }
  }
  console.log('✅ Room types configured');

  // 4. Initial 16 Rooms (101-115 on Floor 1, 201-203 on Floor 2)
  const floor1 = ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '111', '112', '113', '114', '115'];
  const floor2 = ['201', '202', '203'];

  // Seed Floor 1
  for (let i = 0; i < floor1.length; i++) {
    const num = floor1[i];
    let typeName = 'Standard Non-AC';
    if (['105', '106', '107', '108'].includes(num)) typeName = 'Standard AC';
    if (['109', '110', '111', '112'].includes(num)) typeName = 'Premium AC';

    await prisma.room.upsert({
      where: { number: num },
      update: { floor: '1', typeId: roomTypeMap[typeName].id },
      create: {
        number: num,
        floor: '1',
        typeId: roomTypeMap[typeName].id,
        status: 'AVAILABLE',
      },
    });
  }

  // Seed Floor 2
  for (const num of floor2) {
    let typeName = 'Premium AC';
    if (num === '203') typeName = 'Deluxe Family Suite';

    await prisma.room.upsert({
      where: { number: num },
      update: { floor: '2', typeId: roomTypeMap[typeName].id },
      create: {
        number: num,
        floor: '2',
        typeId: roomTypeMap[typeName].id,
        status: 'AVAILABLE',
      },
    });
  }
  console.log('✅ 16 Rooms seeded (101-115, 201-203)');

  // 5. Expense Categories
  const categories = [
    'ELECTRICITY', 'WATER', 'INTERNET', 'SALARY', 'CLEANING',
    'MAINTENANCE', 'ROOM_SUPPLIES', 'TOILETRIES', 'FOOD',
    'REPAIRS', 'TAX', 'MARKETING', 'SOFTWARE', 'RENT', 'OTHER'
  ];

  const catMap = {};
  for (const c of categories) {
    const cat = await prisma.expenseCategory.upsert({
      where: { name: c },
      update: {},
      create: { name: c, description: `${c} operational expense` },
    });
    catMap[c] = cat;
  }
  console.log('✅ 15 Expense categories created');

  // 6. Seed Guests
  const guestsData = [
    { fullName: 'Ananya Sharma', phone: '+919811223344', email: 'ananya.s@gmail.com', city: 'Kolkata', state: 'West Bengal', idType: 'Aadhaar', idNumber: '9876-5432-1098' },
    { fullName: 'Bikram Keshari Rout', phone: '+919438012345', email: 'bikram.rout@outlook.com', city: 'Cuttack', state: 'Odisha', idType: 'Driving License', idNumber: 'OD-05-2019-0045' },
    { fullName: 'Dr. Suresh Chandra Panda', phone: '+919861054321', email: 'suresh.panda@aiims.edu', city: 'Bhubaneswar', state: 'Odisha', idType: 'PAN', idNumber: 'ABCDE1234F' },
    { fullName: 'Pooja Verma', phone: '+919717098765', email: 'pooja.verma@techcorp.in', city: 'Bengaluru', state: 'Karnataka', idType: 'Aadhaar', idNumber: '1122-3344-5566' },
    { fullName: 'Amitabh Sen', phone: '+919830067890', email: 'amitabh.sen@senexports.com', city: 'Kolkata', state: 'West Bengal', idType: 'Passport', idNumber: 'Z5432189' },
  ];

  const guestMap = {};
  for (const g of guestsData) {
    const guest = await prisma.guest.upsert({
      where: { phone: g.phone },
      update: {},
      create: g,
    });
    guestMap[g.fullName] = guest;
  }
  console.log('✅ 5 Example guests created');

  // 7. Seed Operational Bookings & Payments
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 5);
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // Booking 1: Checked-in guest in Room 101 (Standard Non-AC)
  const room101 = await prisma.room.findUnique({ where: { number: '101' }, include: { type: true } });
  const b1 = await prisma.booking.upsert({
    where: { bookingNumber: 'DL-202610-101' },
    update: {},
    create: {
      bookingNumber: 'DL-202610-101',
      guestId: guestMap['Ananya Sharma'].id,
      roomId: room101.id,
      checkInDate: yesterday,
      checkoutDate: tomorrow,
      actualCheckIn: yesterday,
      adults: 2,
      children: 0,
      roomTariff: room101.type.baseTariff,
      nights: 2,
      extraCharges: 20000, // ₹200 extra tea/coffee
      discount: 0,
      tax: 26400, // 12% GST
      totalAmount: (room101.type.baseTariff * 2) + 20000 + 26400, // ₹2,464
      source: 'WALK_IN',
      status: 'CHECKED_IN',
      paymentStatus: 'PARTIALLY_PAID',
      notes: 'Requested extra towel and kettle.',
      createdById: reception.id,
      checkInUserId: reception.id,
    },
  });

  // Mark room 101 OCCUPIED
  await prisma.room.update({
    where: { id: room101.id },
    data: { status: 'OCCUPIED' },
  });

  // Payment for Booking 1: Advance paid via UPI ₹1,500
  await prisma.payment.create({
    data: {
      bookingId: b1.id,
      amount: 150000,
      method: 'UPI',
      reference: 'UPI/DL101/629011',
      notes: 'Advance at check-in via PhonePe QR',
      receivedById: reception.id,
      paymentDate: yesterday,
    },
  });

  // Booking 2: Checked-in guest in Room 201 (Premium AC)
  const room201 = await prisma.room.findUnique({ where: { number: '201' }, include: { type: true } });
  const b2 = await prisma.booking.upsert({
    where: { bookingNumber: 'DL-202610-201' },
    update: {},
    create: {
      bookingNumber: 'DL-202610-201',
      guestId: guestMap['Dr. Suresh Chandra Panda'].id,
      roomId: room201.id,
      checkInDate: today,
      checkoutDate: dayAfter,
      actualCheckIn: today,
      adults: 1,
      children: 0,
      roomTariff: room201.type.baseTariff,
      nights: 2,
      extraCharges: 0,
      discount: 20000, // ₹200 loyalty discount
      tax: 40800,
      totalAmount: (room201.type.baseTariff * 2) - 20000 + 40800, // ₹3,808
      source: 'PHONE',
      status: 'CHECKED_IN',
      paymentStatus: 'PAID',
      notes: 'Attending medical conference at KIIT.',
      createdById: manager.id,
      checkInUserId: reception.id,
    },
  });

  await prisma.room.update({
    where: { id: room201.id },
    data: { status: 'OCCUPIED' },
  });

  // Full Payment for Booking 2: ₹3,808 paid via Card
  await prisma.payment.create({
    data: {
      bookingId: b2.id,
      amount: b2.totalAmount,
      method: 'CARD',
      reference: 'POS-TXN-98442',
      notes: 'Full payment swiped on HDFC POS',
      receivedById: reception.id,
      paymentDate: today,
    },
  });

  // Booking 3: Reserved for tomorrow in Room 105 (Standard AC)
  const room105 = await prisma.room.findUnique({ where: { number: '105' }, include: { type: true } });
  await prisma.booking.upsert({
    where: { bookingNumber: 'DL-202610-105' },
    update: {},
    create: {
      bookingNumber: 'DL-202610-105',
      guestId: guestMap['Pooja Verma'].id,
      roomId: room105.id,
      checkInDate: tomorrow,
      checkoutDate: dayAfter,
      adults: 2,
      children: 1,
      roomTariff: room105.type.baseTariff,
      nights: 1,
      extraCharges: 0,
      discount: 0,
      tax: 16800,
      totalAmount: room105.type.baseTariff + 16800,
      source: 'WHATSAPP',
      status: 'RESERVED',
      paymentStatus: 'UNPAID',
      notes: 'Arrival scheduled by train at 2 PM.',
      createdById: reception.id,
    },
  });

  await prisma.room.update({
    where: { id: room105.id },
    data: { status: 'RESERVED' },
  });

  // Booking 4: Checked-out past stay in Room 102
  const room102 = await prisma.room.findUnique({ where: { number: '102' }, include: { type: true } });
  const b4 = await prisma.booking.upsert({
    where: { bookingNumber: 'DL-202610-102' },
    update: {},
    create: {
      bookingNumber: 'DL-202610-102',
      guestId: guestMap['Amitabh Sen'].id,
      roomId: room102.id,
      checkInDate: lastWeek,
      checkoutDate: threeDaysAgo,
      actualCheckIn: lastWeek,
      actualCheckOut: threeDaysAgo,
      adults: 1,
      children: 0,
      roomTariff: room102.type.baseTariff,
      nights: 2,
      extraCharges: 10000,
      discount: 0,
      tax: 25200,
      totalAmount: (room102.type.baseTariff * 2) + 10000 + 25200,
      source: 'OTA',
      status: 'CHECKED_OUT',
      paymentStatus: 'PAID',
      createdById: reception.id,
      checkInUserId: reception.id,
    },
  });

  // Payment for Booking 4
  await prisma.payment.create({
    data: {
      bookingId: b4.id,
      amount: b4.totalAmount,
      method: 'CASH',
      reference: 'CASH-REC-0012',
      notes: 'Paid cash at counter',
      receivedById: reception.id,
      paymentDate: threeDaysAgo,
    },
  });

  // Set Room 103 CLEANING, Room 104 MAINTENANCE
  const room103 = await prisma.room.findUnique({ where: { number: '103' } });
  if (room103) await prisma.room.update({ where: { id: room103.id }, data: { status: 'CLEANING' } });
  const room104 = await prisma.room.findUnique({ where: { number: '104' } });
  if (room104) await prisma.room.update({ where: { id: room104.id }, data: { status: 'MAINTENANCE', notes: 'AC compressor servicing' } });

  console.log('✅ Active & completed bookings seeded with room status alignment');

  // 8. Seed Realistic Expenses
  const expensesData = [
    {
      category: 'ELECTRICITY',
      amount: 1450000, // ₹14,500.00
      date: yesterday,
      method: 'BANK_TRANSFER',
      vendor: 'TPCODL (Tata Power Odisha)',
      reference: 'TPCODL-BILL-98214',
      notes: 'September month electricity bill payment for Durga Lodge commercial meter',
      createdById: admin.id,
    },
    {
      category: 'CLEANING',
      amount: 240000, // ₹2,400.00
      date: today,
      method: 'CASH',
      vendor: 'Shree Krishna Traders',
      reference: 'BILL-412',
      notes: 'Bleach, Harpic, floor cleaner, and mop refills',
      createdById: manager.id,
    },
    {
      category: 'INTERNET',
      amount: 118000, // ₹1,180.00
      date: threeDaysAgo,
      method: 'UPI',
      vendor: 'BSNL Bharat Fibre',
      reference: 'BSNL-FIBRE-0674',
      notes: 'Monthly 300 Mbps broadband connection for reception and guest Wi-Fi',
      createdById: admin.id,
    },
    {
      category: 'ROOM_SUPPLIES',
      amount: 320000, // ₹3,200.00
      date: yesterday,
      method: 'CASH',
      vendor: 'Laxmi Textile Store',
      reference: 'BILL-908',
      notes: 'White bedsheets (6 pairs) and pillowcases',
      createdById: manager.id,
    },
  ];

  for (const exp of expensesData) {
    await prisma.expense.create({
      data: {
        date: exp.date,
        amount: exp.amount,
        categoryId: catMap[exp.category].id,
        method: exp.method,
        vendor: exp.vendor,
        reference: exp.reference,
        notes: exp.notes,
        createdById: exp.createdById,
      },
    });
  }
  console.log('✅ 4 Operational expenses created');

  // 9. Initial Audit Log Entries
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'HOTEL_CONFIGURED',
        entity: 'HotelSetting',
        entityId: 'durga-lodge-settings',
        metadata: { info: 'Initial hotel setup completed with 16 rooms' },
        timestamp: lastWeek,
      },
      {
        userId: reception.id,
        action: 'CHECK_IN',
        entity: 'Booking',
        entityId: b1.id,
        metadata: { roomNumber: '101', guest: 'Ananya Sharma' },
        timestamp: yesterday,
      },
      {
        userId: reception.id,
        action: 'PAYMENT_ADDED',
        entity: 'Payment',
        entityId: b1.id,
        metadata: { amount: 150000, method: 'UPI' },
        timestamp: yesterday,
      },
      {
        userId: reception.id,
        action: 'CHECK_IN',
        entity: 'Booking',
        entityId: b2.id,
        metadata: { roomNumber: '201', guest: 'Dr. Suresh Chandra Panda' },
        timestamp: today,
      },
    ],
  });
  console.log('✅ Initial audit logs logged');

  console.log('🎉 Seeding successfully completed for DURGA LODGE!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
