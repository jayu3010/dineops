const { PrismaClient } = require('@prisma/client');
const { MongoClient } = require('mongodb');
const prisma = new PrismaClient();

exports.getAllPlans = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja-copy');

    const plans = await db.collection('Plan').find({}).project({
      id: { $toString: '$_id' },
      name: 1,
      price: 1,
      maxTables: 1,
      maxBookingsPerMonth: 1,
      features: 1,
      createdAt: 1
    }).toArray();

    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

exports.createPlan = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja-copy');

    const { name, price, maxTables, maxBookingsPerMonth, features } = req.body;
    const planData = {
      name,
      price: parseFloat(price),
      maxTables: parseInt(maxTables),
      maxBookingsPerMonth: parseInt(maxBookingsPerMonth),
      features,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('Plan').insertOne(planData);
    const plan = { ...planData, id: result.insertedId.toString(), _id: result.insertedId };

    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, maxTables, maxBookingsPerMonth, features } = req.body;
    
    const data = {};
    if (name) data.name = name;
    if (price !== undefined) data.price = parseFloat(price);
    if (maxTables !== undefined) data.maxTables = parseInt(maxTables);
    if (maxBookingsPerMonth !== undefined) data.maxBookingsPerMonth = parseInt(maxBookingsPerMonth);
    if (features) data.features = features;

    const plan = await prisma.plan.update({
      where: { id },
      data
    });
    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.plan.delete({ where: { id } });
    res.json({ success: true, message: 'Plan deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
