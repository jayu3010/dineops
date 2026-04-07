const { PrismaClient } = require('@prisma/client');
const { assertRestaurantAccess } = require('../utils/restaurantScope');
const prisma = new PrismaClient();

const GST_RATE = 0.05;
const KITCHEN_FLOW = ['PENDING', 'PREPARING', 'READY', 'SERVED'];

function computeLineTotals(items) {
  const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
  const gstAmount = Math.round(subtotal * GST_RATE * 100) / 100;
  return { subtotal, gstAmount };
}

function applyDiscountToTotals(subtotal, gstAmount, discountType, discountValue) {
  const preTotal = Math.round(subtotal + gstAmount);
  let discountAmount = 0;
  const dv = Number(discountValue) || 0;
  if (discountType === 'PERCENT' && dv > 0) {
    discountAmount = Math.round(preTotal * (dv / 100));
  } else if (discountType === 'FIXED' && dv > 0) {
    discountAmount = Math.round(Math.min(dv, preTotal));
  }
  const totalAmount = Math.max(0, preTotal - discountAmount);
  return { discountAmount, totalAmount };
}

function computeFullOrderTotals(items, discountType, discountValue) {
  const { subtotal, gstAmount } = computeLineTotals(items);
  const { discountAmount, totalAmount } = applyDiscountToTotals(subtotal, gstAmount, discountType, discountValue);
  return {
    subtotal,
    gstAmount,
    discountType: discountType && ['PERCENT', 'FIXED'].includes(discountType) ? discountType : null,
    discountValue: discountType ? dvOrZero(discountValue) : 0,
    discountAmount,
    totalAmount
  };
}

function dvOrZero(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function recalcOrderTotals(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { discountType: true, discountValue: true }
  });
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  const t = computeFullOrderTotals(items, order?.discountType, order?.discountValue ?? 0);
  return prisma.order.update({
    where: { id: orderId },
    data: {
      subtotal: t.subtotal,
      gstAmount: t.gstAmount,
      discountType: t.discountType,
      discountValue: t.discountValue,
      discountAmount: t.discountAmount,
      totalAmount: t.totalAmount
    },
    include: { items: true, table: true, restaurant: true }
  });
}

function emitIo(req, event, payload) {
  try {
    const io = req.app.get('io');
    if (io && payload.tenantId) {
      io.to(payload.tenantId).emit(event, payload);
    }
  } catch (_) {}
}

/** POST /orders — create order & send to kitchen */
exports.createOrder = async (req, res) => {
  try {
    const { restaurantId, tableId, items, orderType, customerName, customerPhone } = req.body;
    if (!restaurantId || !tableId || !items?.length) {
      return res.status(400).json({ success: false, message: 'restaurantId, tableId, and items are required' });
    }

    const restaurant = await assertRestaurantAccess(req, restaurantId);

    const existing = await prisma.order.findFirst({
      where: {
        restaurantId,
        tableId,
        paymentStatus: 'UNPAID',
        status: { not: 'COMPLETED' }
      }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Table has an open order. Add items to it or complete billing first.',
        data: { orderId: existing.id }
      });
    }

    const lineItems = items.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name || 'Item',
      quantity: parseInt(item.quantity, 10) || 1,
      price: parseFloat(item.price) || 0
    }));

    const t0 = computeFullOrderTotals(lineItems, null, 0);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          restaurantId,
          tableId,
          userId: req.user.id,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          orderType: orderType || 'DINE_IN',
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          subtotal: t0.subtotal,
          gstAmount: t0.gstAmount,
          discountType: null,
          discountValue: 0,
          discountAmount: 0,
          totalAmount: t0.totalAmount,
          items: {
            create: lineItems.map((li) => ({
              menuItemId: li.menuItemId,
              name: li.name,
              quantity: li.quantity,
              price: li.price
            }))
          }
        },
        include: { items: true, table: true, restaurant: true }
      });

      await tx.table.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' }
      });

      return created;
    });

    emitIo(req, 'new-kitchen-order', {
      tenantId: restaurant.tenantId,
      orderId: order.id,
      restaurantId
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

/** PATCH /orders/:id/items — add items to open order */
exports.addOrderItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    if (!items?.length) {
      return res.status(400).json({ success: false, message: 'items array required' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { restaurant: true }
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'COMPLETED' || order.paymentStatus === 'PAID') {
      return res.status(400).json({ success: false, message: 'Order is already closed' });
    }

    await assertRestaurantAccess(req, order.restaurantId);

    const lineItems = items.map((item) => ({
      orderId: id,
      menuItemId: item.menuItemId,
      name: item.name || 'Item',
      quantity: parseInt(item.quantity, 10) || 1,
      price: parseFloat(item.price) || 0
    }));

    await prisma.orderItem.createMany({ data: lineItems });

    const updated = await recalcOrderTotals(id);

    emitIo(req, 'kitchen-order-updated', {
      tenantId: order.restaurant.tenantId,
      orderId: id,
      restaurantId: order.restaurantId
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

/** PATCH /orders/:id/discount — PERCENT | FIXED | clear with discountType NONE */
exports.applyDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    let { discountType, discountValue } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { restaurant: true }
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'COMPLETED' || order.paymentStatus === 'PAID') {
      return res.status(400).json({ success: false, message: 'Order is closed' });
    }

    await assertRestaurantAccess(req, order.restaurantId);

    if (discountType === 'NONE' || discountType === '' || discountType == null) {
      discountType = null;
      discountValue = 0;
    }

    const items = await prisma.orderItem.findMany({ where: { orderId: id } });
    const t = computeFullOrderTotals(items, discountType, discountValue);

    const updated = await prisma.order.update({
      where: { id },
      data: {
        subtotal: t.subtotal,
        gstAmount: t.gstAmount,
        discountType: t.discountType,
        discountValue: t.discountValue,
        discountAmount: t.discountAmount,
        totalAmount: t.totalAmount
      },
      include: { items: true, table: true, restaurant: true }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

/** PATCH /orders/:id/kitchen-status — advance PENDING→…→SERVED */
exports.advanceKitchenStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { restaurant: true }
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'COMPLETED' || order.paymentStatus === 'PAID') {
      return res.status(400).json({ success: false, message: 'Order is closed' });
    }

    await assertRestaurantAccess(req, order.restaurantId);

    const idx = KITCHEN_FLOW.indexOf(order.status);
    if (idx === -1) {
      return res.status(400).json({ success: false, message: 'Invalid kitchen status' });
    }
    if (idx >= KITCHEN_FLOW.length - 1) {
      return res.status(400).json({ success: false, message: 'Already at final kitchen stage' });
    }

    const nextStatus = KITCHEN_FLOW[idx + 1];
    const updated = await prisma.order.update({
      where: { id },
      data: { status: nextStatus },
      include: { items: true, table: true, restaurant: true }
    });

    emitIo(req, 'kitchen-order-updated', {
      tenantId: order.restaurant.tenantId,
      orderId: id,
      restaurantId: order.restaurantId
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

/** PATCH /orders/:id/pay — finalize payment, free table */
exports.markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMode, customerName, customerPhone } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { table: true, restaurant: true }
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await assertRestaurantAccess(req, order.restaurantId);

    if (order.paymentStatus === 'PAID') {
      return res.status(400).json({ success: false, message: 'Order already paid' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          paymentMode: paymentMode || 'CASH',
          customerName: customerName ?? order.customerName,
          customerPhone: customerPhone ?? order.customerPhone,
          completedAt: new Date()
        },
        include: { items: true, table: true }
      });

      if (o.tableId) {
        await tx.table.update({
          where: { id: o.tableId },
          data: { status: 'AVAILABLE' }
        });
      }

      return o;
    });

    emitIo(req, 'kitchen-order-updated', {
      tenantId: order.restaurant.tenantId,
      orderId: id,
      restaurantId: order.restaurantId
    });

    res.json({ success: true, message: 'Order completed', data: updated });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

/** GET active unpaid order for table */
exports.getActiveOrderForTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      select: { id: true, restaurantId: true }
    });
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    await assertRestaurantAccess(req, table.restaurantId);

    const order = await prisma.order.findFirst({
      where: {
        tableId,
        paymentStatus: 'UNPAID',
        status: { not: 'COMPLETED' }
      },
      include: { items: { include: { menuItem: true } }, table: true, restaurant: true }
    });

    res.json({ success: true, data: order });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

/** GET /orders/restaurant/:restaurantId — list orders (optional ?status=&history=) */
exports.getOrders = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status, history } = req.query;

    await assertRestaurantAccess(req, restaurantId);

    const where = { restaurantId };
    if (history === 'true') {
      where.paymentStatus = 'PAID';
    } else if (status && status !== 'ALL') {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: { items: { include: { menuItem: true } }, table: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: history === 'true' ? 200 : 100
    });
    res.json({ success: true, data: orders });
  } catch (error) {
    const statusCode = error.status || 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

/** GET kitchen board — open unpaid orders (optionally filter by status) */
exports.getKitchenOrders = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status } = req.query;

    await assertRestaurantAccess(req, restaurantId);

    const where = {
      restaurantId,
      paymentStatus: 'UNPAID',
      status: { not: 'COMPLETED' }
    };
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: { items: true, table: true },
      orderBy: { createdAt: 'asc' }
    });

    const byTable = {};
    for (const o of orders) {
      const key = o.tableId || 'no-table';
      if (!byTable[key]) byTable[key] = [];
      byTable[key].push(o);
    }

    res.json({ success: true, data: { orders, groupedByTable: byTable } });
  } catch (error) {
    const statusCode = error.status || 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

/**
 * GET /orders/reports/restaurant/:restaurantId
 * Query: from, to (ISO date), page, limit — list by createdAt; payment summary by completedAt in same range (or all time if no range)
 */
exports.getOrderReport = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    await assertRestaurantAccess(req, restaurantId);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const fromQ = req.query.from ? new Date(String(req.query.from)) : null;
    const toQ = req.query.to ? new Date(String(req.query.to)) : null;
    if (toQ) {
      toQ.setHours(23, 59, 59, 999);
    }

    const listWhere = { restaurantId };
    if (fromQ || toQ) {
      listWhere.createdAt = {};
      if (fromQ) listWhere.createdAt.gte = fromQ;
      if (toQ) listWhere.createdAt.lte = toQ;
    }

    const paidSummaryWhere = {
      restaurantId,
      paymentStatus: 'PAID',
      status: 'COMPLETED',
      completedAt: { not: null }
    };
    if (fromQ || toQ) {
      paidSummaryWhere.completedAt = { not: null };
      if (fromQ) paidSummaryWhere.completedAt.gte = fromQ;
      if (toQ) paidSummaryWhere.completedAt.lte = toQ;
    }

    const paidOrdersForSummary = await prisma.order.findMany({
      where: paidSummaryWhere,
      select: { paymentMode: true, totalAmount: true }
    });

    const byPaymentMode = {
      CASH: { count: 0, amount: 0 },
      CARD: { count: 0, amount: 0 },
      UPI: { count: 0, amount: 0 },
      OTHER: { count: 0, amount: 0 }
    };
    for (const o of paidOrdersForSummary) {
      const mode = ['CASH', 'CARD', 'UPI'].includes(o.paymentMode) ? o.paymentMode : 'OTHER';
      byPaymentMode[mode].count += 1;
      byPaymentMode[mode].amount += o.totalAmount || 0;
    }
    for (const k of Object.keys(byPaymentMode)) {
      byPaymentMode[k].amount = Math.round(byPaymentMode[k].amount);
    }

    const totalPaidOrders = paidOrdersForSummary.length;
    const totalRevenue = Math.round(
      paidOrdersForSummary.reduce((s, o) => s + (o.totalAmount || 0), 0)
    );

    const openUnpaidCount = await prisma.order.count({
      where: {
        restaurantId,
        paymentStatus: 'UNPAID',
        status: { not: 'COMPLETED' }
      }
    });

    const totalList = await prisma.order.count({ where: listWhere });
    const orders = await prisma.order.findMany({
      where: listWhere,
      include: {
        table: { select: { tableNumber: true } },
        items: { select: { quantity: true, name: true, price: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const ordersOut = orders.map((o) => ({
      id: o.id,
      createdAt: o.createdAt,
      completedAt: o.completedAt,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMode: o.paymentMode,
      totalAmount: Math.round(o.totalAmount || 0),
      subtotal: o.subtotal,
      gstAmount: o.gstAmount,
      tableNumber: o.table?.tableNumber ?? null,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      itemCount: o.items.reduce((n, it) => n + it.quantity, 0),
      itemsPreview: o.items.slice(0, 4).map((it) => `${it.name}×${it.quantity}`)
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalPaidOrders,
          totalRevenue,
          openUnpaidOrders: openUnpaidCount,
          byPaymentMode,
          dateFilter: {
            applied: Boolean(fromQ || toQ),
            from: fromQ ? fromQ.toISOString() : null,
            to: toQ ? toQ.toISOString() : null,
            note:
              'Payment breakdown uses completedAt in this range; the table lists orders by createdAt in the same range. Leave dates empty for all time.'
          }
        },
        orders: ordersOut,
        pagination: {
          page,
          limit,
          total: totalList,
          totalPages: Math.max(1, Math.ceil(totalList / limit))
        }
      }
    });
  } catch (error) {
    const statusCode = error.status || 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
