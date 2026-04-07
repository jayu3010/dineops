const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

const ANALYTICS_ROLES = ['ADMIN', 'SUPERADMIN', 'MANAGER'];

router.get(
  '/dashboard/restaurant/:restaurantId',
  verifyToken,
  verifyRole(...ANALYTICS_ROLES),
  analyticsController.getRestaurantDashboard
);
router.get(
  '/restaurant/:restaurantId',
  verifyToken,
  verifyRole(...ANALYTICS_ROLES),
  analyticsController.getRestaurantAnalytics
);

module.exports = router;
