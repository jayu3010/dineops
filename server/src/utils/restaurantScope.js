const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/** ADMIN (owner), staff (MANAGER/WAITER/CASHIER) with matching JWT restaurantId, or SUPERADMIN */
async function assertRestaurantAccess(req, restaurantId) {
  if (!restaurantId) {
    const err = new Error('Restaurant ID required');
    err.status = 400;
    throw err;
  }

  if (req.user.role === 'SUPERADMIN') {
    const r = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!r) {
      const e = new Error('Restaurant not found');
      e.status = 404;
      throw e;
    }
    return r;
  }

  if (['MANAGER', 'WAITER', 'CASHIER'].includes(req.user.role)) {
    if (req.user.restaurantId === restaurantId) {
      const r = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
      if (!r) {
        const e = new Error('Restaurant not found');
        e.status = 404;
        throw e;
      }
      return r;
    }
    const e = new Error('Forbidden');
    e.status = 403;
    throw e;
  }

  const r = await prisma.restaurant.findFirst({
    where: { id: restaurantId, ownerId: req.user.id }
  });
  if (!r) {
    const e = new Error('Forbidden');
    e.status = 403;
    throw e;
  }
  return r;
}

module.exports = { assertRestaurantAccess };
