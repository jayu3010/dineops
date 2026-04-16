const { PrismaClient } = require('@prisma/client');
const { assertRestaurantAccess } = require('../utils/restaurantScope');
const { sendLowStockAlert } = require('../utils/lowStockEmail');

const prisma = new PrismaClient();

const UNITS = new Set(['kg', 'L', 'pcs', 'ml']);

function parseRange(fromStr, toStr) {
  const from = fromStr ? new Date(String(fromStr)) : null;
  const to = toStr ? new Date(String(toStr)) : null;
  if (to) {
    to.setHours(23, 59, 59, 999);
  }
  return { from, to };
}

/** GET dashboard */
exports.getDashboard = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const restaurant = await assertRestaurantAccess(req, restaurantId);

    const ingredients = await prisma.ingredient.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
      include: { supplier: { select: { id: true, name: true } } }
    });

    const lowStock = ingredients.filter((i) => i.currentStock <= i.minStockAlert);
    const pendingPo = await prisma.purchaseOrder.count({
      where: { restaurantId, status: 'PENDING' }
    });

    const recentTx = await prisma.stockTransaction.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        ingredient: { select: { id: true, name: true, unit: true } },
        user: { select: { id: true, name: true } }
      }
    });

    res.json({
      success: true,
      data: {
        restaurant: { id: restaurant.id, name: restaurant.name },
        summary: {
          ingredientCount: ingredients.length,
          lowStockCount: lowStock.length,
          pendingPurchaseOrders: pendingPo
        },
        lowStock,
        ingredients,
        recentTransactions: recentTx
      }
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/** GET ingredients list */
exports.listIngredients = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    await assertRestaurantAccess(req, restaurantId);

    const ingredients = await prisma.ingredient.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
      include: { supplier: { select: { id: true, name: true } } }
    });
    res.json({ success: true, data: ingredients });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/** POST ingredient */
exports.createIngredient = async (req, res) => {
  try {
    const { restaurantId, name, unit, currentStock, minStockAlert, costPerUnit, supplierId, category } = req.body;
    if (!restaurantId || !name || !unit) {
      return res.status(400).json({ success: false, message: 'restaurantId, name, and unit are required' });
    }
    const u = String(unit).toLowerCase();
    if (!UNITS.has(u)) {
      return res.status(400).json({ success: false, message: 'unit must be one of: kg, L, pcs, ml' });
    }

    await assertRestaurantAccess(req, restaurantId);

    if (supplierId) {
      const sup = await prisma.supplier.findFirst({ where: { id: supplierId, restaurantId } });
      if (!sup) {
        return res.status(400).json({ success: false, message: 'Supplier not found for this restaurant' });
      }
    }

    const ing = await prisma.ingredient.create({
      data: {
        restaurantId,
        name: String(name).trim(),
        unit: u,
        currentStock: Number(currentStock) || 0,
        minStockAlert: Number(minStockAlert) || 0,
        costPerUnit: Math.max(0, Number(costPerUnit) || 0),
        supplierId: supplierId || null,
        category: category ? String(category).trim() : null
      },
      include: { supplier: true }
    });

    res.status(201).json({ success: true, data: ing });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/** PATCH ingredient */
exports.updateIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.ingredient.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Ingredient not found' });
    }
    await assertRestaurantAccess(req, existing.restaurantId);

    const { name, unit, minStockAlert, costPerUnit, supplierId, category } = req.body;
    const data = {};
    if (name != null) data.name = String(name).trim();
    if (unit != null) {
      const u = String(unit).toLowerCase();
      if (!UNITS.has(u)) {
        return res.status(400).json({ success: false, message: 'unit must be one of: kg, L, pcs, ml' });
      }
      data.unit = u;
    }
    if (minStockAlert != null) data.minStockAlert = Number(minStockAlert) || 0;
    if (costPerUnit != null) data.costPerUnit = Math.max(0, Number(costPerUnit) || 0);
    if (category !== undefined) data.category = category ? String(category).trim() : null;

    if (supplierId !== undefined) {
      if (supplierId === null || supplierId === '') {
        data.supplierId = null;
      } else {
        const sup = await prisma.supplier.findFirst({ where: { id: supplierId, restaurantId: existing.restaurantId } });
        if (!sup) {
          return res.status(400).json({ success: false, message: 'Supplier not found' });
        }
        data.supplierId = supplierId;
      }
    }

    const ing = await prisma.ingredient.update({
      where: { id },
      data,
      include: { supplier: true }
    });
    res.json({ success: true, data: ing });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/** DELETE ingredient */
exports.deleteIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.ingredient.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Ingredient not found' });
    }
    await assertRestaurantAccess(req, existing.restaurantId);
    await prisma.ingredient.delete({ where: { id } });
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/** Suppliers */
exports.listSuppliers = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    await assertRestaurantAccess(req, restaurantId);
    const suppliers = await prisma.supplier.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const { restaurantId, name, phone, email, address, itemsNote } = req.body;
    if (!restaurantId || !name) {
      return res.status(400).json({ success: false, message: 'restaurantId and name are required' });
    }
    await assertRestaurantAccess(req, restaurantId);
    const s = await prisma.supplier.create({
      data: {
        restaurantId,
        name: String(name).trim(),
        phone: phone || null,
        email: email || null,
        address: address || null,
        itemsNote: itemsNote || null
      }
    });
    res.status(201).json({ success: true, data: s });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    await assertRestaurantAccess(req, existing.restaurantId);
    const { name, phone, email, address, itemsNote } = req.body;
    const s = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name != null && { name: String(name).trim() }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(address !== undefined && { address: address || null }),
        ...(itemsNote !== undefined && { itemsNote: itemsNote || null })
      }
    });
    res.json({ success: true, data: s });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    await assertRestaurantAccess(req, existing.restaurantId);
    await prisma.supplier.delete({ where: { id } });
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/** Recipe for menu item */
exports.getRecipe = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const item = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        category: true,
        recipeIngredients: { include: { ingredient: true } }
      }
    });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }
    await assertRestaurantAccess(req, item.category.restaurantId);
    res.json({ success: true, data: item.recipeIngredients });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/** PUT recipe — body: { lines: [{ ingredientId, quantityUsed }] } */
exports.putRecipe = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const { lines } = req.body;
    if (!Array.isArray(lines)) {
      return res.status(400).json({ success: false, message: 'lines array required' });
    }

    const item = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: { category: true }
    });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }
    const restaurantId = item.category.restaurantId;
    await assertRestaurantAccess(req, restaurantId);

    for (const row of lines) {
      if (!row.ingredientId || row.quantityUsed == null) {
        return res.status(400).json({ success: false, message: 'Each line needs ingredientId and quantityUsed' });
      }
      const q = Number(row.quantityUsed);
      if (!Number.isFinite(q) || q < 0) {
        return res.status(400).json({ success: false, message: 'quantityUsed must be a non-negative number' });
      }
      const ing = await prisma.ingredient.findFirst({
        where: { id: row.ingredientId, restaurantId }
      });
      if (!ing) {
        return res.status(400).json({ success: false, message: `Ingredient ${row.ingredientId} not in restaurant` });
      }
    }

    await prisma.$transaction([
      prisma.menuItemIngredient.deleteMany({ where: { menuItemId } }),
      ...lines.map((row) =>
        prisma.menuItemIngredient.create({
          data: {
            menuItemId,
            ingredientId: row.ingredientId,
            quantityUsed: Number(row.quantityUsed)
          }
        })
      )
    ]);

    const recipe = await prisma.menuItemIngredient.findMany({
      where: { menuItemId },
      include: { ingredient: true }
    });
    res.json({ success: true, data: recipe });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/** Stock adjustment / waste / manual IN */
exports.adjustStock = async (req, res) => {
  try {
    const { restaurantId, ingredientId, type, quantity, note } = req.body;
    if (!restaurantId || !ingredientId || !type || quantity == null) {
      return res.status(400).json({
        success: false,
        message: 'restaurantId, ingredientId, type, and quantity are required'
      });
    }
    const t = String(type).toUpperCase();
    if (!['IN', 'WASTE', 'ADJUST'].includes(t)) {
      return res.status(400).json({ success: false, message: 'type must be IN, WASTE, or ADJUST' });
    }

    await assertRestaurantAccess(req, restaurantId);

    const ing = await prisma.ingredient.findFirst({ where: { id: ingredientId, restaurantId } });
    if (!ing) {
      return res.status(404).json({ success: false, message: 'Ingredient not found' });
    }

    const q = Number(quantity);
    if (!Number.isFinite(q)) {
      return res.status(400).json({ success: false, message: 'Invalid quantity' });
    }

    let delta = q;
    let txQty = Math.abs(q);
    if (t === 'IN') {
      if (q <= 0) {
        return res.status(400).json({ success: false, message: 'IN quantity must be positive' });
      }
      delta = q;
      txQty = q;
    } else if (t === 'WASTE') {
      if (q <= 0) {
        return res.status(400).json({ success: false, message: 'WASTE quantity must be positive' });
      }
      delta = -q;
    } else if (t === 'ADJUST') {
      delta = q;
      txQty = Math.abs(q);
    }

    const newStock = Math.round((ing.currentStock + delta) * 10000) / 10000;

    const { updatedIng, stockTx } = await prisma.$transaction(async (tx) => {
      const u = await tx.ingredient.update({
        where: { id: ingredientId },
        data: { currentStock: newStock },
        include: { supplier: true }
      });
      const st = await tx.stockTransaction.create({
        data: {
          restaurantId,
          ingredientId,
          type: t,
          quantity: t === 'ADJUST' ? q : txQty,
          note: note ? String(note).slice(0, 500) : null,
          userId: req.user.id
        }
      });
      return { updatedIng: u, stockTx: st };
    });

    if (newStock <= ing.minStockAlert) {
      const r = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
      if (r) {
        sendLowStockAlert(
          { id: r.id, name: r.name, ownerId: r.ownerId },
          [
            {
              id: ing.id,
              name: ing.name,
              unit: ing.unit,
              currentStock: newStock,
              minStockAlert: ing.minStockAlert
            }
          ]
        ).catch(() => {});
      }
    }

    res.json({ success: true, data: { ingredient: updatedIng, transaction: stockTx } });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/** GET transactions */
exports.listTransactions = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    await assertRestaurantAccess(req, restaurantId);

    const { from, to } = parseRange(req.query.from, req.query.to);
    const { type } = req.query;
    const where = { restaurantId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }
    if (type && type !== 'ALL') {
      where.type = String(type).toUpperCase();
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 40));
    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      prisma.stockTransaction.count({ where }),
      prisma.stockTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          ingredient: { select: { id: true, name: true, unit: true } },
          user: { select: { id: true, name: true } }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        transactions: rows,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      }
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/** Purchase orders */
exports.listPurchaseOrders = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    await assertRestaurantAccess(req, restaurantId);
    const orders = await prisma.purchaseOrder.findMany({
      where: { restaurantId },
      orderBy: { orderedAt: 'desc' },
      include: {
        supplier: { select: { id: true, name: true } },
        lines: { include: { ingredient: { select: { id: true, name: true, unit: true } } } }
      },
      take: 100
    });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    const { restaurantId, supplierId, lines } = req.body;
    if (!restaurantId || !supplierId || !Array.isArray(lines) || !lines.length) {
      return res.status(400).json({
        success: false,
        message: 'restaurantId, supplierId, and lines[] are required'
      });
    }
    await assertRestaurantAccess(req, restaurantId);

    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, restaurantId } });
    if (!supplier) {
      return res.status(400).json({ success: false, message: 'Supplier not found' });
    }

    let totalCost = 0;
    const normalized = [];
    for (const row of lines) {
      const qty = Number(row.quantity);
      const unitCost = Number(row.unitCost);
      if (!row.ingredientId || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
        return res.status(400).json({ success: false, message: 'Each line needs ingredientId, quantity > 0, unitCost >= 0' });
      }
      const ing = await prisma.ingredient.findFirst({ where: { id: row.ingredientId, restaurantId } });
      if (!ing) {
        return res.status(400).json({ success: false, message: 'Ingredient not in restaurant' });
      }
      const lineTotal = Math.round(qty * unitCost * 100) / 100;
      totalCost += lineTotal;
      normalized.push({ ingredientId: row.ingredientId, quantity: qty, unitCost });
    }
    totalCost = Math.round(totalCost * 100) / 100;

    const po = await prisma.purchaseOrder.create({
      data: {
        restaurantId,
        supplierId,
        status: 'PENDING',
        totalCost,
        lines: {
          create: normalized.map((l) => ({
            ingredientId: l.ingredientId,
            quantity: l.quantity,
            unitCost: l.unitCost
          }))
        }
      },
      include: {
        supplier: true,
        lines: { include: { ingredient: true } }
      }
    });

    res.status(201).json({ success: true, data: po });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.receivePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: true, restaurant: true, supplier: true }
    });
    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }
    await assertRestaurantAccess(req, po.restaurantId);

    if (po.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Only PENDING orders can be received' });
    }

    await prisma.$transaction(async (tx) => {
      for (const line of po.lines) {
        const ing = await tx.ingredient.findUnique({ where: { id: line.ingredientId } });
        if (!ing) continue;
        const newStock = Math.round((ing.currentStock + line.quantity) * 10000) / 10000;
        const newCost = line.unitCost > 0 ? line.unitCost : ing.costPerUnit;
        await tx.ingredient.update({
          where: { id: line.ingredientId },
          data: {
            currentStock: newStock,
            costPerUnit: newCost
          }
        });
        await tx.stockTransaction.create({
          data: {
            restaurantId: po.restaurantId,
            ingredientId: line.ingredientId,
            type: 'IN',
            quantity: line.quantity,
            note: `PO ${po.id} received`,
            userId: req.user.id
          }
        });
      }

      await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'RECEIVED', receivedAt: new Date() }
      });
    });

    const updated = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: { include: { ingredient: true } }, supplier: true }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/** Reports */
exports.reportConsumption = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    await assertRestaurantAccess(req, restaurantId);
    const { from, to } = parseRange(req.query.from, req.query.to);
    const where = { restaurantId, type: 'OUT' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const txs = await prisma.stockTransaction.findMany({
      where,
      include: { ingredient: { select: { id: true, name: true, unit: true, costPerUnit: true } } }
    });

    const byIng = new Map();
    for (const t of txs) {
      const key = t.ingredientId;
      if (!byIng.has(key)) {
        byIng.set(key, {
          ingredientId: key,
          name: t.ingredient.name,
          unit: t.ingredient.unit,
          totalQuantity: 0,
          estimatedCost: 0
        });
      }
      const row = byIng.get(key);
      row.totalQuantity += t.quantity;
      row.estimatedCost += t.quantity * (t.ingredient.costPerUnit || 0);
    }

    const daily = {};
    for (const t of txs) {
      const d = t.createdAt.toISOString().slice(0, 10);
      if (!daily[d]) daily[d] = 0;
      daily[d] += t.quantity;
    }

    res.json({
      success: true,
      data: {
        byIngredient: [...byIng.values()].map((r) => ({
          ...r,
          totalQuantity: Math.round(r.totalQuantity * 10000) / 10000,
          estimatedCost: Math.round(r.estimatedCost * 100) / 100
        })),
        dailyTotals: daily
      }
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.reportWastage = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    await assertRestaurantAccess(req, restaurantId);
    const { from, to } = parseRange(req.query.from, req.query.to);
    const where = { restaurantId, type: 'WASTE' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const txs = await prisma.stockTransaction.findMany({
      where,
      include: { ingredient: { select: { id: true, name: true, unit: true, costPerUnit: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const byIng = new Map();
    let totalCost = 0;
    for (const t of txs) {
      const c = t.quantity * (t.ingredient.costPerUnit || 0);
      totalCost += c;
      if (!byIng.has(t.ingredientId)) {
        byIng.set(t.ingredientId, {
          ingredientId: t.ingredientId,
          name: t.ingredient.name,
          unit: t.ingredient.unit,
          quantity: 0,
          cost: 0
        });
      }
      const row = byIng.get(t.ingredientId);
      row.quantity += t.quantity;
      row.cost += c;
    }

    res.json({
      success: true,
      data: {
        transactions: txs,
        summary: {
          totalWasteQty: txs.reduce((s, t) => s + t.quantity, 0),
          estimatedCost: Math.round(totalCost * 100) / 100,
          byIngredient: [...byIng.values()].map((r) => ({
            ...r,
            quantity: Math.round(r.quantity * 10000) / 10000,
            cost: Math.round(r.cost * 100) / 100
          }))
        }
      }
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.reportCostAnalysis = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    await assertRestaurantAccess(req, restaurantId);
    const { from, to } = parseRange(req.query.from, req.query.to);

    const txWhere = { restaurantId, type: { in: ['OUT', 'WASTE'] } };
    if (from || to) {
      txWhere.createdAt = {};
      if (from) txWhere.createdAt.gte = from;
      if (to) txWhere.createdAt.lte = to;
    }

    const txs = await prisma.stockTransaction.findMany({
      where: txWhere,
      include: { ingredient: { select: { costPerUnit: true } } }
    });

    let foodCost = 0;
    for (const t of txs) {
      foodCost += t.quantity * (t.ingredient?.costPerUnit || 0);
    }
    foodCost = Math.round(foodCost * 100) / 100;

    const orderWhere = { restaurantId, paymentStatus: 'PAID', status: 'COMPLETED' };
    if (from || to) {
      orderWhere.completedAt = {};
      if (from) orderWhere.completedAt.gte = from;
      if (to) orderWhere.completedAt.lte = to;
    }

    const paidOrders = await prisma.order.findMany({
      where: orderWhere,
      select: { totalAmount: true }
    });
    const revenue = Math.round(paidOrders.reduce((s, o) => s + (o.totalAmount || 0), 0) * 100) / 100;
    const margin = revenue > 0 ? Math.round((1 - foodCost / revenue) * 10000) / 100 : null;

    res.json({
      success: true,
      data: {
        period: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
        estimatedFoodCost: foodCost,
        revenueFromPaidOrders: revenue,
        approxFoodCostPercentOfRevenue: revenue > 0 ? Math.round((foodCost / revenue) * 10000) / 100 : null,
        approxGrossMarginPercent: margin,
        note:
          'Food cost uses current ingredient costPerUnit × quantities from OUT and WASTE transactions; revenue uses paid orders in the same date range (completedAt).'
      }
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};