const { PrismaClient } = require('@prisma/client');
const { MongoClient } = require('mongodb');
const prisma = new PrismaClient();

// Create Order (Billing)
exports.createOrder = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja-copy');

    const { restaurantId, tableId, items } = req.body; // items: [{menuItemId, quantity, price}]
    const userId = req.user.id;

    // Calculate total
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05; // 5% GST
    const totalAmount = subtotal + tax;

    const orderData = {
      restaurantId: require('mongodb').ObjectId.createFromHexString(restaurantId),
      tableId: tableId ? require('mongodb').ObjectId.createFromHexString(tableId) : null,
      userId: require('mongodb').ObjectId.createFromHexString(userId),
      totalAmount,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const orderResult = await db.collection('Order').insertOne(orderData);
    const order = { ...orderData, id: orderResult.insertedId.toString(), _id: orderResult.insertedId };

    // Create order items
    const orderItems = items.map(item => ({
      orderId: orderResult.insertedId,
      menuItemId: require('mongodb').ObjectId.createFromHexString(item.menuItemId),
      quantity: item.quantity,
      price: item.price,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await db.collection('OrderItem').insertMany(orderItems);

    // Get order with items
    const fullOrder = await db.collection('Order').aggregate([
      { $match: { _id: orderResult.insertedId } },
      {
        $lookup: {
          from: 'OrderItem',
          localField: '_id',
          foreignField: 'orderId',
          as: 'items'
        }
      },
      {
        $lookup: {
          from: 'Table',
          localField: 'tableId',
          foreignField: '_id',
          as: 'table'
        }
      },
      { $unwind: { path: '$table', preserveNullAndEmptyArrays: true } }
    ]).toArray();

    const result = fullOrder[0];

    // Update table status to OCCUPIED if applicable
    if (tableId) {
      await db.collection('Table').updateOne(
        { _id: require('mongodb').ObjectId.createFromHexString(tableId) },
        { $set: { status: 'OCCUPIED', updatedAt: new Date() } }
      );
    }

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

// Mark Order as Paid
exports.markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.update({
      where: { id },
      data: { status: 'PAID' },
      include: { table: true }
    });

    // Update table status to AVAILABLE
    if (order.tableId) {
      await prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'AVAILABLE' }
      });
    }

    res.json({ success: true, message: 'Order paid successfully', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Orders for a Restaurant
exports.getOrders = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const orders = await prisma.order.findMany({
      where: { restaurantId },
      include: { items: { include: { menuItem: true } }, table: true, user: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
