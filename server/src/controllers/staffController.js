const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { assertRestaurantAccess } = require('../utils/restaurantScope');

const prisma = new PrismaClient();

const STAFF_ROLES = ['MANAGER', 'WAITER', 'CASHIER'];

async function resolveRestaurantIdForAdmin(req) {
  if (req.user.role === 'SUPERADMIN') {
    const rid = req.query.restaurantId;
    if (!rid) {
      const e = new Error('Query restaurantId is required for superadmin');
      e.status = 400;
      throw e;
    }
    return rid;
  }
  const r = await prisma.restaurant.findFirst({
    where: { ownerId: req.user.id },
    select: { id: true }
  });
  if (!r) {
    const e = new Error('No restaurant found for this account');
    e.status = 403;
    throw e;
  }
  return r.id;
}

exports.listStaff = async (req, res) => {
  try {
    const restaurantId = await resolveRestaurantIdForAdmin(req);
    await assertRestaurantAccess(req, restaurantId);

    const staff = await prisma.user.findMany({
      where: { staffRestaurantId: restaurantId, role: { in: STAFF_ROLES } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: staff });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const restaurantId = await resolveRestaurantIdForAdmin(req);
    await assertRestaurantAccess(req, restaurantId);

    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'name, email, and password are required' });
    }
    if (!STAFF_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `role must be one of: ${STAFF_ROLES.join(', ')}`
      });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        staffRestaurantId: restaurantId,
        isVerified: true
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

exports.updateStaffRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!STAFF_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `role must be one of: ${STAFF_ROLES.join(', ')}`
      });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target?.staffRestaurantId) {
      return res.status(404).json({ success: false, message: 'Staff user not found' });
    }

    await assertRestaurantAccess(req, target.staffRestaurantId);

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target?.staffRestaurantId) {
      return res.status(404).json({ success: false, message: 'Staff user not found' });
    }

    await assertRestaurantAccess(req, target.staffRestaurantId);

    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'Staff removed' });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};
