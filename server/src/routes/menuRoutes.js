const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

const MENU_EDIT = ['ADMIN', 'SUPERADMIN', 'MANAGER'];

router.post('/category', verifyToken, verifyRole(...MENU_EDIT), menuController.createCategory);
router.patch('/category/:id', verifyToken, verifyRole(...MENU_EDIT), menuController.updateCategory);
router.delete('/category/:id', verifyToken, verifyRole(...MENU_EDIT), menuController.deleteCategory);
router.get('/:restaurantId', menuController.getMenu);
router.post('/item', verifyToken, verifyRole(...MENU_EDIT), menuController.createMenuItem);
router.patch('/item/:id', verifyToken, verifyRole(...MENU_EDIT), menuController.updateMenuItem);
router.delete('/item/:id', verifyToken, verifyRole(...MENU_EDIT), menuController.deleteMenuItem);

module.exports = router;
