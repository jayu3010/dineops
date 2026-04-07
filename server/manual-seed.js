const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function seedDatabase() {
  const uri = 'mongodb://localhost:27017/petpooja_mongodb';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('petpooja_mongodb');

    // 1. Create SuperAdmin
    const adminEmail = 'superadmin@petpooja.com';
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const existingAdmin = await db.collection('User').findOne({ email: adminEmail });
    if (!existingAdmin) {
      const superAdmin = {
        name: 'Global Administrator',
        email: adminEmail,
        password: hashedPassword,
        role: 'SUPERADMIN',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('User').insertOne(superAdmin);
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
        features: 'Table Management,Basic Analytics,Email Support',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Professional',
        price: 2499.0,
        maxTables: 30,
        maxBookingsPerMonth: 1500,
        features: 'Visual Floor Plan,Advanced Analytics,Socket.io Real-time,Priority Support',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Enterprise',
        price: 4999.0,
        maxTables: 100,
        maxBookingsPerMonth: 5000,
        features: 'Custom Branding,Multi-location support,Dedicated Manager,24/7 Support',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const plan of plans) {
      const existingPlan = await db.collection('Plan').findOne({ name: plan.name });
      if (!existingPlan) {
        await db.collection('Plan').insertOne(plan);
        console.log(`Plan created: ${plan.name}`);
      } else {
        await db.collection('Plan').updateOne({ name: plan.name }, { $set: plan });
        console.log(`Plan updated: ${plan.name}`);
      }
    }

    // 3. Create Sample Restaurant
    const restaurantName = "Petpooja Copy Restaurant";
    let restaurant = await db.collection('Restaurant').findOne({ tenantId: "petpooja-copy" });

    if (!restaurant) {
      console.log('Sample restaurant not found, creating...');
      const admin = await db.collection('User').findOne({ role: 'SUPERADMIN' });
      const plan = await db.collection('Plan').findOne({});

      if (admin && plan) {
        restaurant = {
          name: restaurantName,
          tenantId: "petpooja-copy",
          address: "123 Main St",
          city: "San Francisco",
          cuisine: "Indian",
          description: "A copy of Petpooja",
          openTime: "09:00",
          closeTime: "22:00",
          phone: "1234567890",
          status: "PENDING",
          ownerId: admin._id,
          planId: plan._id,
          createdAt: new Date()
        };
        const result = await db.collection('Restaurant').insertOne(restaurant);
        restaurant._id = result.insertedId;
        console.log('Sample restaurant created:', restaurant.name);
      }
    } else {
      console.log('Sample restaurant already exists:', restaurant.name);
    }

    console.log('Database seeded successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await client.close();
  }
}

seedDatabase();