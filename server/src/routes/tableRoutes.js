const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

const POS_ROLES = ['ADMIN', 'SUPERADMIN', 'MANAGER', 'WAITER', 'CASHIER'];
const TABLE_ADMIN = ['ADMIN', 'SUPERADMIN', 'MANAGER'];

// Get all tables for a restaurant
router.get('/all/:restaurantId', verifyToken, verifyRole(...POS_ROLES), tableController.getTables);

router.post('/', verifyToken, verifyRole(...TABLE_ADMIN), tableController.createTable);
router.patch('/:id', verifyToken, verifyRole(...TABLE_ADMIN), tableController.updateTable);
router.delete('/:id', verifyToken, verifyRole(...TABLE_ADMIN), tableController.deleteTable);

module.exports = router;
