const { PrismaClient } = require('@prisma/client');
const { MongoClient } = require('mongodb');
const prisma = new PrismaClient();

const tableController = require('./tableController');

exports.getAllRestaurants = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja_mongodb');

    const restaurants = await db.collection('Restaurant').aggregate([
      {
        $lookup: {
          from: 'User',
          localField: 'ownerId',
          foreignField: '_id',
          as: 'owner'
        }
      },
      {
        $lookup: {
          from: 'Plan',
          localField: 'planId',
          foreignField: '_id',
          as: 'plan'
        }
      },
      {
        $unwind: { path: '$owner', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$plan', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          id: { $toString: '$_id' },
          name: 1,
          address: 1,
          city: 1,
          cuisine: 1,
          description: 1,
          openTime: 1,
          closeTime: 1,
          phone: 1,
          tenantId: 1,
          status: 1,
          createdAt: 1,
          owner: { name: '$owner.name', email: '$owner.email' },
          plan: 1
        }
      }
    ]).toArray();

    res.json({ success: true, data: restaurants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

exports.updateRestaurantStatus = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    const { id } = req.params;
    const { status } = req.body; // ACTIVE, SUSPENDED, PENDING

    await client.connect();
    const db = client.db('petpooja_mongodb');

    const result = await db.collection('Restaurant').updateOne(
      { _id: require('mongodb').ObjectId.createFromHexString(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // If active, initialize 20 tables if not already present
    if (status === 'ACTIVE') {
      await tableController.initializeTables(id);
    }

    // If active, we might want to send an email notification
    res.json({ success: true, message: `Restaurant status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

exports.registerRestaurant = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja_mongodb');

    const { name, address, city, cuisine, description, openTime, closeTime, phone, planId, ownerId: reqOwnerId } = req.body;

    // If SuperAdmin is creating, they can specify an ownerId. Otherwise, use token user ID.
    const isSuperAdmin = req.user.role === 'SUPERADMIN';
    const ownerId = (isSuperAdmin && reqOwnerId) ? reqOwnerId : req.user.id;

    // Check if user already owns a restaurant
    const existingRestaurant = await db.collection('Restaurant').findOne({
      ownerId: require('mongodb').ObjectId.createFromHexString(ownerId)
    });
    if (existingRestaurant) {
      return res.status(400).json({ success: false, message: 'This user already has a restaurant registered.' });
    }

    const tenantId = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

    // SuperAdmins can automatically approve the restaurant and we can initialize tables
    const status = isSuperAdmin ? 'ACTIVE' : 'PENDING';

    const restaurantData = {
      name, address, city, cuisine, description, openTime, closeTime, phone, tenantId,
      planId: require('mongodb').ObjectId.createFromHexString(planId),
      ownerId: require('mongodb').ObjectId.createFromHexString(ownerId),
      status,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('Restaurant').insertOne(restaurantData);
    const restaurant = { ...restaurantData, id: result.insertedId.toString(), _id: result.insertedId };

    // Update user's role to ADMIN
    await db.collection('User').updateOne(
      { _id: require('mongodb').ObjectId.createFromHexString(ownerId) },
      { $set: { role: 'ADMIN', updatedAt: new Date() } }
    );

    if (status === 'ACTIVE') {
      await tableController.initializeTables(restaurant.id);
    }

    res.status(201).json({ success: true, message: 'Restaurant created successfully!', data: restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

exports.deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.restaurant.delete({ where: { id } });
    res.json({ success: true, message: 'Restaurant deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, cuisine, description, openTime, closeTime, phone, planId, ownerId } = req.body;
    
    // Make sure owner isn't assigned to another restaurant, unless it's the current one
    if (ownerId) {
       const existingOwnerRes = await prisma.restaurant.findUnique({ where: { ownerId } });
       if (existingOwnerRes && existingOwnerRes.id !== id) {
          return res.status(400).json({ success: false, message: 'User is already assigned to another restaurant' });
       }
    }

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: { name, address, city, cuisine, description, openTime, closeTime, phone, planId, ownerId }
    });
    
    // Update owner's role to ADMIN if changed
    if (ownerId) {
      await prisma.user.update({ where: { id: ownerId }, data: { role: 'ADMIN' } });
    }

    res.json({ success: true, message: 'Restaurant updated successfully', data: restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
