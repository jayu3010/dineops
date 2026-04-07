const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Seed script started...');
  // 1. Create SuperAdmin
  const adminEmail = 'superadmin@petpooja.com';
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const superAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Global Administrator',
        password: hashedPassword,
        role: 'SUPERADMIN',
        isVerified: true
      }
    });
    console.log('SuperAdmin created:', superAdmin.email);
  } else {
    console.log('SuperAdmin already exists:', adminEmail);
  }

  // 2. Create Plans
  const plans = [
    {
      name: 'Starter',
      price: 999.0,
      maxTables: 10,
      maxBookingsPerMonth: 300,
      features: 'Table Management,Basic Analytics,Email Support'
    },
    {
      name: 'Professional',
      price: 2499.0,
      maxTables: 30,
      maxBookingsPerMonth: 1500,
      features: 'Visual Floor Plan,Advanced Analytics,Socket.io Real-time,Priority Support'
    },
    {
      name: 'Enterprise',
      price: 4999.0,
      maxTables: 100,
      maxBookingsPerMonth: 5000,
      features: 'Custom Branding,Multi-location support,Dedicated Manager,24/7 Support'
    }
  ];

  for (const plan of plans) {
    const existingPlan = await prisma.plan.findUnique({
      where: { name: plan.name }
    });

    if (!existingPlan) {
      await prisma.plan.create({
        data: plan
      });
      console.log(`Plan created: ${plan.name}`);
    } else {
      await prisma.plan.update({
        where: { name: plan.name },
        data: plan
      });
      console.log(`Plan updated: ${plan.name}`);
    }
  }
  console.log('Subscription plans seeded.');

  // 3. Create Sample Restaurant
  console.log('Checking for sample restaurant...');
  const restaurantName = "Petpooja Copy Restaurant";
  let restaurant = await prisma.restaurant.findUnique({
    where: { tenantId: "petpooja-copy" }
  });

  if (!restaurant) {
    console.log('Sample restaurant not found, creating...');
    const admin = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } });
    const plan = await prisma.plan.findFirst();
    
    if (admin && plan) {
      restaurant = await prisma.restaurant.create({
        data: {
          name: restaurantName,
          tenantId: "petpooja-copy",
          address: "123 Main St",
          city: "San Francisco",
          cuisine: "Indian",
          description: "A copy of Petpooja",
          openTime: "09:00",
          closeTime: "22:00",
          phone: "1234567890",
          ownerId: admin.id,
          planId: plan.id,
          status: "ACTIVE"
        }
      });
      console.log('Sample restaurant created');
    } else {
      console.log('Admin or Plan not found for restaurant creation');
    }
  } else {
    console.log('Sample restaurant already exists');
  }

  // 4. Create Tables
  if (restaurant) {
    console.log('Checking for tables...');
    const tableCount = await prisma.table.count({ where: { restaurantId: restaurant.id } });
    if (tableCount === 0) {
      console.log('Seeding 10 tables...');
      for (let i = 1; i <= 10; i++) {
        await prisma.table.create({
          data: {
            restaurantId: restaurant.id,
            tableNumber: `T${i}`,
            capacity: 4,
            status: 'AVAILABLE',
            x: (i - 1) % 5 * 150 + 50,
            y: Math.floor((i - 1) / 5) * 150 + 50
          }
        });
      }
      console.log('10 tables seeded.');
    } else {
      console.log(`${tableCount} tables already exist`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
