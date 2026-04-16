const { PrismaClient } = require('@prisma/client');
const { MongoClient, ObjectId } = require('mongodb');
const prisma = new PrismaClient();

function combineDateAndTime(dateStr, hhmm) {
  const t = String(hhmm || '12:00').trim().slice(0, 5);
  const d = String(dateStr).trim();
  return new Date(`${d}T${t}:00`);
}

/** If end is before/equal start (e.g. 22:00–02:00), add one day to end */
function bookingWindow(dateStr, startHm, endHm) {
  let start = combineDateAndTime(dateStr, startHm);
  let end = combineDateAndTime(dateStr, endHm);
  if (end <= start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }
  return { start, end };
}

async function findAvailableTableId(restaurantId, guests, slotStart, slotEnd, db, dateStr) {
  const g = parseInt(guests, 10) || 1;
  const tables = await prisma.table.findMany({
    where: { restaurantId, capacity: { gte: g } },
    orderBy: { tableNumber: 'asc' }
  });
  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  tables.sort((a, b) => collator.compare(String(a.tableNumber), String(b.tableNumber)));

  const bookingDate = new Date(dateStr);

  for (const t of tables) {
    const tableOid = new ObjectId(t.id);
    const overlapping = await db.collection('Booking').findOne({
      tableId: tableOid,
      date: bookingDate,
      status: { $in: ['CONFIRMED', 'PENDING'] },
      $or: [
        { startTime: { $lt: slotEnd }, endTime: { $gt: slotStart } }
      ]
    });
    if (!overlapping) return t.id;
  }
  return null;
}

/** GET /bookings/slots/public/:tenantId?date=&guests= */
exports.listPublicTimeSlots = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const guests = parseInt(req.query.guests, 10) || 2;

    const restaurant = await prisma.restaurant.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true }
    });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const client = new MongoClient(process.env.DATABASE_URL);
    await client.connect();
    const db = client.db('petpooja-copy');

    const slots = await prisma.timeSlot.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      orderBy: { startTime: 'asc' }
    });

    const out = [];
    for (const s of slots) {
      const { start: slotStart, end: slotEnd } = bookingWindow(date, s.startTime, s.endTime);
      const tableId = await findAvailableTableId(restaurant.id, guests, slotStart, slotEnd, db, date);
      out.push({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        label: `${s.startTime} – ${s.endTime}`,
        available: Boolean(tableId)
      });
    }

    await client.close();
    res.json({ success: true, data: out });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBooking = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja-copy');

    const {
      restaurantId,
      tableId: bodyTableId,
      slotId,
      date,
      time,
      guests,
      fullName,
      email,
      phone
    } = req.body;
    const userId = req.user?.id;

    if (!restaurantId || !date || !guests) {
      return res.status(400).json({ success: false, message: 'restaurantId, date, and guests are required' });
    }

    let tableId = bodyTableId;
    let bookingStartTime;
    let bookingEndTime;
    let resolvedSlotId = slotId || null;

    if (slotId) {
      const slot = await prisma.timeSlot.findFirst({
        where: { id: slotId, restaurantId, isActive: true }
      });
      if (!slot) {
        return res.status(400).json({ success: false, message: 'Invalid or inactive time slot' });
      }
      const win = bookingWindow(date, slot.startTime, slot.endTime);
      bookingStartTime = win.start;
      bookingEndTime = win.end;

      const tid = await findAvailableTableId(restaurantId, guests, bookingStartTime, bookingEndTime, db, date);
      if (!tid) {
        return res.status(400).json({
          success: false,
          message: 'No table is available for this slot and party size. Pick another time.'
        });
      }
      tableId = tid;
    } else if (bodyTableId && time) {
      bookingStartTime = combineDateAndTime(date, time);
      bookingEndTime = new Date(bookingStartTime.getTime() + 2 * 60 * 60 * 1000);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either slotId or (tableId and time) is required'
      });
    }

    const bookingDate = new Date(date);

    const overlappingBooking = await db.collection('Booking').findOne({
      tableId: new ObjectId(tableId),
      date: bookingDate,
      status: { $in: ['CONFIRMED', 'PENDING'] },
      $or: [
        { startTime: { $lte: bookingStartTime }, endTime: { $gt: bookingStartTime } },
        { startTime: { $lt: bookingEndTime }, endTime: { $gte: bookingEndTime } }
      ]
    });

    if (overlappingBooking) {
      return res.status(400).json({ success: false, message: 'That table is no longer available for the selected time.' });
    }

    const restaurant = await db.collection('Restaurant').findOne({
      _id: new ObjectId(restaurantId)
    });

    const bookingData = {
      fullName,
      email,
      phone,
      guests: parseInt(guests, 10),
      date: bookingDate,
      startTime: bookingStartTime,
      endTime: bookingEndTime,
      status: 'CONFIRMED',
      restaurantId: new ObjectId(restaurantId),
      tableId: new ObjectId(tableId),
      slotId: resolvedSlotId ? new ObjectId(resolvedSlotId) : null,
      tenantId: restaurant.tenantId,
      userId: userId ? new ObjectId(userId) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('Booking').insertOne(bookingData);
    const booking = { ...bookingData, id: result.insertedId.toString(), _id: result.insertedId };

    const io = req.app.get('io');
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
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
