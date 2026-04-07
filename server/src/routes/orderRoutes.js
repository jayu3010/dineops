const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

const POS_ROLES = ['ADMIN', 'SUPERADMIN', 'MANAGER', 'WAITER', 'CASHIER'];
const REPORT_ROLES = ['ADMIN', 'SUPERADMIN', 'MANAGER'];

router.get(
  '/reports/restaurant/:restaurantId',
  verifyToken,
  verifyRole(...REPORT_ROLES),
  orderController.getOrderReport
);
router.get(
  '/kitchen/restaurant/:restaurantId',
  verifyToken,
  verifyRole(...POS_ROLES),
  orderController.getKitchenOrders
);
router.get(
  '/table/:tableId/active',
  verifyToken,
  verifyRole(...POS_ROLES),
  orderController.getActiveOrderForTable
);
router.get(
  '/restaurant/:restaurantId',
  verifyToken,
  verifyRole(...POS_ROLES),
  orderController.getOrders
);

router.post('/', verifyToken, verifyRole(...POS_ROLES), orderController.createOrder);
router.patch('/:id/discount', verifyToken, verifyRole(...POS_ROLES), orderController.applyDiscount);
router.patch('/:id/items', verifyToken, verifyRole(...POS_ROLES), orderController.addOrderItems);
router.patch('/:id/kitchen-status', verifyToken, verifyRole(...POS_ROLES), orderController.advanceKitchenStatus);
router.patch('/:id/pay', verifyToken, verifyRole(...POS_ROLES), orderController.markAsPaid);

module.exports = router;
