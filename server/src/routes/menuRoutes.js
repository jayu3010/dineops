const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

router.post('/category', verifyToken, verifyRole('ADMIN'), menuController.createCategory);
router.patch('/category/:id', verifyToken, verifyRole('ADMIN'), menuController.updateCategory);
router.delete('/category/:id', verifyToken, verifyRole('ADMIN'), menuController.deleteCategory);
router.get('/:restaurantId', menuController.getMenu);
router.post('/item', verifyToken, verifyRole('ADMIN'), menuController.createMenuItem);
router.patch('/item/:id', verifyToken, verifyRole('ADMIN'), menuController.updateMenuItem);
router.delete('/item/:id', verifyToken, verifyRole('ADMIN'), menuController.deleteMenuItem);

module.exports = router;
