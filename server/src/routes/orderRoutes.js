const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

const POS_ROLES = ['ADMIN', 'SUPERADMIN', 'MANAGER', 'WAITER', 'CASHIER'];
const REPORT_ROLES = ['ADMIN', 'SUPERADMIN', 'MANAGER'];

router.post('/public/:tenantId', orderController.createPublicOnlineOrder);

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
  '/incoming/restaurant/:restaurantId',
  verifyToken,
  verifyRole(...POS_ROLES),
  orderController.getIncomingOrdersQueue
);
router.get(
  '/pos-order/:id',
  verifyToken,
  verifyRole(...POS_ROLES),
  orderController.getOrderByIdForStaff
);
router.get(
  '/restaurant/:restaurantId',
  verifyToken,
  verifyRole(...POS_ROLES),
  orderController.getOrders
);

router.post('/', verifyToken, verifyRole(...POS_ROLES), orderController.createOrder);
router.patch(
  '/:id/approve-incoming',
  verifyToken,
  verifyRole(...POS_ROLES),
  orderController.approveIncomingOrder
);
router.patch(
  '/:id/reject-incoming',
  verifyToken,
  verifyRole(...POS_ROLES),
  orderController.rejectIncomingOrder
);
router.patch('/:id/discount', verifyToken, verifyRole(...POS_ROLES), orderController.applyDiscount);
router.patch('/:id/items', verifyToken, verifyRole(...POS_ROLES), orderController.addOrderItems);
router.patch('/:id/kitchen-status', verifyToken, verifyRole(...POS_ROLES), orderController.advanceKitchenStatus);
router.patch('/:id/pay', verifyToken, verifyRole(...POS_ROLES), orderController.markAsPaid);

module.exports = router;
