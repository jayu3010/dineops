const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

router.post('/', verifyToken, verifyRole('ADMIN', 'USER'), orderController.createOrder);
router.patch('/:id/pay', verifyToken, verifyRole('ADMIN'), orderController.markAsPaid);
router.get('/restaurant/:restaurantId', verifyToken, verifyRole('ADMIN'), orderController.getOrders);

module.exports = router;
