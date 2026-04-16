const { PrismaClient } = require('@prisma/client');
const { MongoClient } = require('mongodb');
const { assertRestaurantAccess } = require('../utils/restaurantScope');
const prisma = new PrismaClient();

/** T1, T2, … T9, T10 (not T1, T10, T2…) */
function sortTablesByNumberNatural(tables) {
  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  return [...tables].sort((a, b) =>
    collator.compare(String(a.tableNumber ?? ''), String(b.tableNumber ?? ''))
  );
}

/** GET for booking UI — active restaurant only, no floor-plan coords required */
exports.getPublicTablesByTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const restaurant = await prisma.restaurant.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true }
    });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    const tables = await prisma.table.findMany({
      where: { restaurantId: restaurant.id },
      select: {
        id: true,
        tableNumber: true,
        capacity: true,
        status: true,
        section: true
      }
    });
    const sorted = sortTablesByNumberNatural(tables);
    res.json({ success: true, data: sorted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTables = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    const { restaurantId } = req.params;
    await assertRestaurantAccess(req, restaurantId);

    await client.connect();
    const db = client.db('petpooja-copy');
    const tables = await db.collection('Table').find({
      restaurantId: require('mongodb').ObjectId.createFromHexString(restaurantId)
    }).project({
      id: { $toString: '$_id' },
      tableNumber: 1,
      capacity: 1,
      shape: 1,
      status: 1,
      x: 1,
      y: 1,
      restaurantId: { $toString: '$restaurantId' }
    }).toArray();

    const sorted = sortTablesByNumberNatural(tables);

    res.json({ success: true, data: sorted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

// Initialize 20 tables for a restaurant
exports.initializeTables = async (restaurantId) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja-copy');

    const tablesCount = await db.collection('Table').countDocuments({
      restaurantId: require('mongodb').ObjectId.createFromHexString(restaurantId)
    });
    if (tablesCount > 0) return;

    const tablesData = [];
    for (let i = 1; i <= 20; i++) {
      tablesData.push({
        restaurantId: require('mongodb').ObjectId.createFromHexString(restaurantId),
        tableNumber: `T${i}`,
        capacity: 4,
        shape: 'SQUARE',
        status: 'AVAILABLE',
        x: (i - 1) % 5 * 150 + 50,
        y: Math.floor((i - 1) / 5) * 150 + 50,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await db.collection('Table').insertMany(tablesData);
  } finally {
    await client.close();
  }
};

exports.createTable = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja-copy');

    const { tableNumber, capacity, shape, x, y, restaurantId } = req.body;

    const tableData = {
      tableNumber,
      capacity: parseInt(capacity),
      shape: shape || 'SQUARE',
      x: parseFloat(x) || 0,
      y: parseFloat(y) || 0,
      restaurantId: require('mongodb').ObjectId.createFromHexString(restaurantId),
      status: 'AVAILABLE',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('Table').insertOne(tableData);
    const table = { ...tableData, id: result.insertedId.toString(), _id: result.insertedId };

    res.status(201).json({ success: true, data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

exports.updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { tableNumber, capacity, status, shape, x, y } = req.body;

    const table = await prisma.table.update({
      where: { id },
      data: { 
        tableNumber, 
        capacity: capacity ? parseInt(capacity) : undefined, 
        status,
        shape,
        x: x !== undefined ? parseFloat(x) : undefined,
        y: y !== undefined ? parseFloat(y) : undefined
      }
    });

    res.json({ success: true, data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.table.delete({ where: { id } });
    res.json({ success: true, message: 'Table deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
