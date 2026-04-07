const { PrismaClient } = require('@prisma/client');
const { MongoClient, ObjectId } = require('mongodb');
const { assertRestaurantAccess } = require('../utils/restaurantScope');

const prisma = new PrismaClient();

async function withMongoBookings(restaurantId, handler) {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja-copy');
    const rid = ObjectId.createFromHexString(restaurantId);
    return await handler(db, rid);
  } finally {
    await client.close();
  }
}

function mongoBookingInPeriod(db, rid, start, end) {
  return db
    .collection('Booking')
    .find({
      restaurantId: rid,
      startTime: { $gte: start, $lte: end }
    })
    .project({ startTime: 1, date: 1, fullName: 1, guests: 1, status: 1 })
    .toArray();
}

async function mongoBookingsInRange(restaurantId, start, end) {
  return withMongoBookings(restaurantId, (db, rid) => mongoBookingInPeriod(db, rid, start, end));
}

async function mongoBookingCountRange(restaurantId, start, end) {
  return withMongoBookings(restaurantId, async (db, rid) =>
    db.collection('Booking').countDocuments({
      restaurantId: rid,
      startTime: { $gte: start, $lte: end }
    })
  );
}

async function mongoRecentBookings(restaurantId, limit) {
  return withMongoBookings(restaurantId, async (db, rid) =>
    db
      .collection('Booking')
      .find({ restaurantId: rid })
      .sort({ startTime: -1 })
      .limit(limit)
      .project({ startTime: 1, date: 1, fullName: 1, guests: 1, status: 1 })
      .toArray()
  );
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function roundRupees(n) {
  return Math.round(Number(n) || 0);
}

/**
 * Presets: last7 | last15 | last30 | thisMonth | lastMonth
 * Legacy: bookingDays=7|15|30|90 maps to similar windows
 */
function resolveAnalyticsPeriod(now, preset, legacyBookingDays) {
  if (legacyBookingDays && !preset) {
    const d = Math.min(Math.max(parseInt(legacyBookingDays, 10) || 30, 7), 90);
    const start = startOfDay(new Date(now.getTime() - (d - 1) * 86400000));
    const end = endOfDay(now);
    return {
      start,
      end,
      trendDayKeys: buildDayKeys(start, end),
      label: `Last ${d} days`,
      preset: `legacy_${d}`
    };
  }

  const p = String(preset || 'last30').toLowerCase();
  const end = endOfDay(now);

  if (p === 'last7') {
    const start = startOfDay(new Date(now.getTime() - 6 * 86400000));
    return {
      start,
      end,
      trendDayKeys: buildDayKeys(start, end),
      label: 'Last 7 days',
      preset: 'last7'
    };
  }
  if (p === 'last15') {
    const start = startOfDay(new Date(now.getTime() - 14 * 86400000));
    return {
      start,
      end,
      trendDayKeys: buildDayKeys(start, end),
      label: 'Last 15 days',
      preset: 'last15'
    };
  }
  if (p === 'thismonth' || p === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    return {
      start,
      end,
      trendDayKeys: buildDayKeys(start, end),
      label: 'This month',
      preset: 'thisMonth'
    };
  }
  if (p === 'lastmonth' || p === 'last_month') {
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const start = new Date(y, m, 1);
    start.setHours(0, 0, 0, 0);
    const endLm = new Date(y, m + 1, 0, 23, 59, 59, 999);
    return {
      start,
      end: endLm,
      trendDayKeys: buildDayKeys(start, endLm),
      label: 'Last month',
      preset: 'lastMonth'
    };
  }
  // last30 default
  const start = startOfDay(new Date(now.getTime() - 29 * 86400000));
  return {
    start,
    end,
    trendDayKeys: buildDayKeys(start, end),
    label: 'Last 30 days',
    preset: 'last30'
  };
}

function buildDayKeys(start, end) {
  const keys = [];
  const c = new Date(start);
  c.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  while (c <= e) {
    keys.push(c.toISOString().slice(0, 10));
    c.setDate(c.getDate() + 1);
  }
  return keys;
}

/** GET /analytics/restaurant/:restaurantId ?period=last7|last15|last30|thisMonth|lastMonth &bookingDays= (legacy) */
exports.getRestaurantAnalytics = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const periodParam = req.query.period;
    const legacyDays = req.query.bookingDays;

    await assertRestaurantAccess(req, restaurantId);

    const now = new Date();
    const { start, end, trendDayKeys, label, preset } = resolveAnalyticsPeriod(
      now,
      periodParam,
      legacyDays && !periodParam ? legacyDays : null
    );

    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const paidOrdersAll = await prisma.order.findMany({
      where: {
        restaurantId,
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        completedAt: { not: null }
      },
      select: {
        totalAmount: true,
        completedAt: true,
        createdAt: true,
        orderType: true,
        items: { select: { quantity: true, price: true, name: true, menuItemId: true } },
        tableId: true,
        paymentMode: true,
        status: true
      }
    });

    const inPeriod = (d) => d >= start && d <= end;
    const paidInPeriod = paidOrdersAll.filter((o) => inPeriod(o.completedAt));

    const revenueToday = paidOrdersAll
      .filter((o) => o.completedAt >= todayStart && o.completedAt <= todayEnd)
      .reduce((s, o) => s + o.totalAmount, 0);

    const periodRevenue = paidInPeriod.reduce((s, o) => s + o.totalAmount, 0);
    const periodPaidCount = paidInPeriod.length;
    const avgOrderValue =
      periodPaidCount > 0 ? periodRevenue / periodPaidCount : 0;

    const orderTypeBreakdown = { DINE_IN: 0, TAKEAWAY: 0, DELIVERY: 0, OTHER: 0 };
    for (const o of paidInPeriod) {
      const t = o.orderType || 'DINE_IN';
      if (Object.prototype.hasOwnProperty.call(orderTypeBreakdown, t)) {
        orderTypeBreakdown[t] += 1;
      } else {
        orderTypeBreakdown.OTHER += 1;
      }
    }

    let mongoBookings = [];
    try {
      mongoBookings = await mongoBookingsInRange(restaurantId, start, end);
    } catch (mongoErr) {
      console.warn('analytics mongo bookings:', mongoErr.message);
    }

    const bookingByDay = {};
    for (const k of trendDayKeys) {
      bookingByDay[k] = 0;
    }
    for (const b of mongoBookings) {
      const d = b.startTime || b.date;
      if (!d) continue;
      const key = startOfDay(new Date(d)).toISOString().slice(0, 10);
      if (bookingByDay[key] !== undefined) bookingByDay[key] += 1;
    }

    const bookingTrend = trendDayKeys.map((date) => ({ date, count: bookingByDay[date] || 0 }));

    const bookingsInPeriod = mongoBookings.length;

    const itemStats = {};
    for (const o of paidInPeriod) {
      for (const it of o.items) {
        const key = it.menuItemId || it.name;
        if (!itemStats[key]) {
          itemStats[key] = { menuItemId: it.menuItemId, name: it.name, timesOrdered: 0, revenue: 0 };
        }
        itemStats[key].timesOrdered += it.quantity;
        itemStats[key].revenue += it.quantity * it.price;
      }
    }
    const topMenuItems = Object.values(itemStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

    const tableUsage = {};
    for (const o of paidInPeriod) {
      if (!o.tableId) continue;
      if (!tableUsage[o.tableId]) tableUsage[o.tableId] = { count: 0, durationSum: 0 };
      tableUsage[o.tableId].count += 1;
      const dur =
        o.completedAt && o.createdAt ? (o.completedAt.getTime() - o.createdAt.getTime()) / 60000 : 0;
      tableUsage[o.tableId].durationSum += dur;
    }

    const tables = await prisma.table.findMany({
      where: { restaurantId },
      select: { id: true, tableNumber: true }
    });
    const tableMap = Object.fromEntries(tables.map((t) => [t.id, t.tableNumber]));

    const tableUtilization = Object.entries(tableUsage).map(([tableId, v]) => ({
      tableId,
      tableNumber: tableMap[tableId] || tableId,
      orderCount: v.count,
      avgOccupancyMinutes: v.count > 0 ? Math.round(v.durationSum / v.count) : 0
    }));

    const ordersForHeat = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: start, lte: end }
      },
      select: { createdAt: true }
    });

    const heatmap = [];
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        heatmap.push({ dayOfWeek: d, hour: h, count: 0 });
      }
    }
    const idx = (d, h) => d * 24 + h;
    for (const o of ordersForHeat) {
      const day = o.createdAt.getDay();
      const hour = o.createdAt.getHours();
      heatmap[idx(day, hour)].count += 1;
    }

    const recentOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: start, lte: end }
      },
      include: { items: true, table: true },
      orderBy: { updatedAt: 'desc' },
      take: 25
    });

    const recentOrdersFormatted = recentOrders.map((o) => ({
      id: o.id,
      date: o.completedAt || o.createdAt,
      tableNumber: o.table?.tableNumber || '—',
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      amount: roundRupees(o.totalAmount),
      paymentMode: o.paymentMode || '—',
      status: o.status,
      paymentStatus: o.paymentStatus
    }));

    res.json({
      success: true,
      data: {
        period: {
          preset,
          label,
          start: start.toISOString(),
          end: end.toISOString()
        },
        revenue: {
          today: roundRupees(revenueToday),
          periodTotal: roundRupees(periodRevenue),
          periodPaidOrders: periodPaidCount,
          bookingsInPeriod,
          week: roundRupees(periodRevenue),
          month: roundRupees(periodRevenue),
          avgOrderValue: roundRupees(avgOrderValue)
        },
        bookingTrend,
        topMenuItems,
        tableUtilization,
        heatmap,
        recentOrders: recentOrdersFormatted,
        orderTypeBreakdown,
        bookingsSource: 'mongo'
      }
    });
  } catch (error) {
    const statusCode = error.status || 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

/** GET /analytics/dashboard/restaurant/:restaurantId */
exports.getRestaurantDashboard = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    await assertRestaurantAccess(req, restaurantId);

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfDay(new Date(now.getTime() - 6 * 86400000));

    const [totalTables, availableTables, paidToday, paidWeek] = await Promise.all([
      prisma.table.count({ where: { restaurantId } }),
      prisma.table.count({ where: { restaurantId, status: 'AVAILABLE' } }),
      prisma.order.findMany({
        where: {
          restaurantId,
          paymentStatus: 'PAID',
          completedAt: { gte: todayStart, lte: todayEnd }
        },
        select: { totalAmount: true, orderType: true }
      }),
      prisma.order.findMany({
        where: {
          restaurantId,
          paymentStatus: 'PAID',
          completedAt: { gte: weekStart, lte: todayEnd }
        },
        select: { totalAmount: true }
      })
    ]);

    let todayBookings = 0;
    let bookingsWeekRows = [];
    try {
      todayBookings = await mongoBookingCountRange(restaurantId, todayStart, todayEnd);
      const weekBookings = await mongoBookingsInRange(restaurantId, weekStart, todayEnd);
      bookingsWeekRows = weekBookings.map((b) => ({ date: b.startTime || b.date }));
    } catch (mongoErr) {
      console.warn('dashboard mongo bookings:', mongoErr.message);
    }

    const revenueToday = roundRupees(paidToday.reduce((s, o) => s + o.totalAmount, 0));
    const revenueWeek = roundRupees(paidWeek.reduce((s, o) => s + o.totalAmount, 0));

    const orderTypeToday = { DINE_IN: 0, TAKEAWAY: 0, DELIVERY: 0, OTHER: 0 };
    for (const o of paidToday) {
      const t = o.orderType || 'DINE_IN';
      if (Object.prototype.hasOwnProperty.call(orderTypeToday, t)) {
        orderTypeToday[t] += 1;
      } else {
        orderTypeToday.OTHER += 1;
      }
    }

    const trendMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      trendMap[startOfDay(d).toISOString().slice(0, 10)] = 0;
    }
    for (const b of bookingsWeekRows) {
      const k = startOfDay(b.date).toISOString().slice(0, 10);
      if (trendMap[k] !== undefined) trendMap[k] += 1;
    }
    const bookingTrend7d = Object.entries(trendMap).map(([date, count]) => ({
      name: new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short' }),
      date,
      bookings: count
    }));

    let recentMongo = [];
    try {
      recentMongo = await mongoRecentBookings(restaurantId, 8);
    } catch (mongoErr) {
      console.warn('dashboard recent mongo bookings:', mongoErr.message);
    }

    const recentBookingsOut = recentMongo.map((b) => ({
      id: b._id ? String(b._id) : '',
      guestName: b.fullName || 'Guest',
      tableNumber: '—',
      date: b.startTime || b.date,
      status: b.status || 'CONFIRMED',
      guestCount: b.guests ?? 0
    }));

    res.json({
      success: true,
      data: {
        todayBookings,
        totalTables,
        availableTables,
        occupiedTables: Math.max(0, totalTables - availableTables),
        revenueToday,
        revenueWeek,
        bookingTrend7d,
        recentBookings: recentBookingsOut,
        orderTypeToday,
        bookingsSource: 'mongo'
      }
    });
  } catch (error) {
    const statusCode = error.status || 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
