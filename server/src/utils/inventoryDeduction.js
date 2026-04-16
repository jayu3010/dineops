/**
 * Deduct stock from recipes when POS orders include menu items.
 * Runs inside an existing Prisma interactive transaction (tx).
 */

async function buildUsageByIngredient(tx, lineItems) {
  const menuItemIds = [...new Set(lineItems.map((l) => l.menuItemId).filter(Boolean))];
  if (!menuItemIds.length) {
    return new Map();
  }

  const recipes = await tx.menuItemIngredient.findMany({
    where: { menuItemId: { in: menuItemIds } }
  });

  const usage = new Map();
  for (const line of lineItems) {
    const qty = Number(line.quantity) || 0;
    if (qty <= 0) continue;
    for (const r of recipes) {
      if (r.menuItemId !== line.menuItemId) continue;
      const add = r.quantityUsed * qty;
      usage.set(r.ingredientId, (usage.get(r.ingredientId) || 0) + add);
    }
  }
  return usage;
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {{ restaurantId: string, orderId: string, userId?: string|null, lineItems: { menuItemId: string, quantity: number }[] }} params
 * @returns {Promise<{ lowStock: { id: string, name: string, unit: string, currentStock: number, minStockAlert: number }[] }>}
 */
async function deductIngredientsForOrderLines(tx, params) {
  const { restaurantId, orderId, userId, lineItems } = params;
  const usage = await buildUsageByIngredient(tx, lineItems);
  const lowStock = [];

  for (const [ingredientId, qty] of usage.entries()) {
    if (qty <= 0) continue;

    const ing = await tx.ingredient.findFirst({
      where: { id: ingredientId, restaurantId }
    });
    if (!ing) continue;

    const newStock = Math.round((ing.currentStock - qty) * 10000) / 10000;

    await tx.ingredient.update({
      where: { id: ingredientId },
      data: { currentStock: newStock }
    });

    await tx.stockTransaction.create({
      data: {
        restaurantId,
        ingredientId,
        type: 'OUT',
        quantity: Math.round(qty * 10000) / 10000,
        note: `Order ${orderId}`,
        userId: userId || null,
        orderId
      }
    });

    if (newStock <= ing.minStockAlert) {
      lowStock.push({
        id: ing.id,
        name: ing.name,
        unit: ing.unit,
        currentStock: newStock,
        minStockAlert: ing.minStockAlert
      });
    }
  }

  return { lowStock };
}

module.exports = { deductIngredientsForOrderLines, buildUsageByIngredient };
