const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Restaurant owner — update profile (GSTIN, FSSAI, etc.) — must be before /:id routes
router.patch('/my', verifyToken, verifyRole('ADMIN'), restaurantController.patchMyRestaurant);

// SuperAdmin only
router.get('/', verifyToken, verifyRole('SUPERADMIN'), restaurantController.getAllRestaurants);
router.patch('/:id/status', verifyToken, verifyRole('SUPERADMIN'), restaurantController.updateRestaurantStatus);
router.put('/:id', verifyToken, verifyRole('SUPERADMIN'), restaurantController.updateRestaurant);
router.delete('/:id', verifyToken, verifyRole('SUPERADMIN'), restaurantController.deleteRestaurant);

// Admin / User
router.post('/register', verifyToken, restaurantController.registerRestaurant);

module.exports = router;
