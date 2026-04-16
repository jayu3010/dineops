const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

router.get('/slots/public/:tenantId', bookingController.listPublicTimeSlots);

// Create booking (Public or Authenticated)
router.post('/', (req, res, next) => {
  // If token exists, verify it, else proceed as guest
  if (req.headers.authorization) {
    return verifyToken(req, res, next);
  }
  next();
}, bookingController.createBooking);

// User bookings
router.get('/my', verifyToken, bookingController.getUserBookings);

// Restaurant bookings (Admin only)
router.get('/restaurant/:restaurantId', verifyToken, verifyRole('ADMIN'), bookingController.getRestaurantBookings);

module.exports = router;
