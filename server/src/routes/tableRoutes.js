const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { verifyToken, verifyRole, verifyTenant } = require('../middleware/authMiddleware');

// Get all tables for a restaurant
router.get('/all/:restaurantId', verifyToken, tableController.getTables);

// Admin only actions
router.post('/', verifyToken, verifyRole('ADMIN'), tableController.createTable);
router.patch('/:id', verifyToken, verifyRole('ADMIN'), tableController.updateTable);
router.delete('/:id', verifyToken, verifyRole('ADMIN'), tableController.deleteTable);

module.exports = router;
