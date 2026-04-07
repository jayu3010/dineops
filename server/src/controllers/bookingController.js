const { PrismaClient } = require('@prisma/client');
const { MongoClient } = require('mongodb');
const prisma = new PrismaClient();

exports.createBooking = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja_mongodb');

    const { restaurantId, tableId, date, time, guests, fullName, email, phone } = req.body;
    const userId = req.user?.id; // Optional if guest booking

    // 1. Check if table is available for that time slot
    // For simplicity, we assume a booking is for 2 hours
    const bookingDate = new Date(date);
    const bookingStartTime = new Date(`${date}T${time}:00`);
    const bookingEndTime = new Date(bookingStartTime.getTime() + 2 * 60 * 60 * 1000);

    const overlappingBooking = await db.collection('Booking').findOne({
      tableId: require('mongodb').ObjectId.createFromHexString(tableId),
      date: bookingDate,
      status: { $in: ['CONFIRMED', 'PENDING'] },
      $or: [
        {
          // New booking starts during an existing booking
          startTime: { $lte: bookingStartTime },
          endTime: { $gt: bookingStartTime }
        },
        {
          // New booking ends during an existing booking
          startTime: { $lt: bookingEndTime },
          endTime: { $gte: bookingEndTime }
        }
      ]
    });

    if (overlappingBooking) {
      return res.status(400).json({ success: false, message: 'Table is not available for the selected time.' });
    }

    // Get restaurant tenantId
    const restaurant = await db.collection('Restaurant').findOne({
      _id: require('mongodb').ObjectId.createFromHexString(restaurantId)
    });

    const bookingData = {
      fullName,
      email,
      phone,
      guests: parseInt(guests),
      date: bookingDate,
      startTime: bookingStartTime,
      endTime: bookingEndTime,
      status: 'CONFIRMED', // Auto-confirm for now
      restaurantId: require('mongodb').ObjectId.createFromHexString(restaurantId),
      tableId: require('mongodb').ObjectId.createFromHexString(tableId),
      tenantId: restaurant.tenantId,
      userId: userId ? require('mongodb').ObjectId.createFromHexString(userId) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('Booking').insertOne(bookingData);
    const booking = { ...bookingData, id: result.insertedId.toString(), _id: result.insertedId };

    // Update table status
    await db.collection('Table').updateOne(
      { _id: require('mongodb').ObjectId.createFromHexString(tableId) },
      { $set: { status: 'OCCUPIED', updatedAt: new Date() } }
    );

    // Emit Socket Event
    const io = req.app.get('io');
    io.to(booking.tenantId).emit('table-status-updated', { tableId, status: 'OCCUPIED' });
    io.to(booking.tenantId).emit('new-booking', booking);

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: { restaurant: { select: { name: true, city: true } }, table: true },
      orderBy: { date: 'desc' }
    });
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { number, capacity, status, x, y } = req.body;
    const table = await prisma.table.update({
      where: { id },
      data: { 
        number, 
        capacity: capacity ? parseInt(capacity) : undefined, 
        status,
        x: x !== undefined ? parseFloat(x) : undefined,
        y: y !== undefined ? parseFloat(y) : undefined
      },
      include: { restaurant: true }
    });

    // Emit Socket Event
    const io = req.app.get('io');
    io.to(table.restaurant.tenantId).emit('table-updated', table);

    res.json({ success: true, data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRestaurantBookings = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const bookings = await prisma.booking.findMany({
      where: { restaurantId },
      include: { table: true },
      orderBy: { startTime: 'asc' }
    });
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
