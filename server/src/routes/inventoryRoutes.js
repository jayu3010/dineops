const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

const INVENTORY_ROLES = ['ADMIN', 'SUPERADMIN', 'MANAGER'];

router.get(
  '/restaurant/:restaurantId/dashboard',
  verifyToken,
  verifyRole(...INVENTORY_ROLES),
  inventoryController.getDashboard
);
router.get(
  '/restaurant/:restaurantId/ingredients',
  verifyToken,
  verifyRole(...INVENTORY_ROLES),
  inventoryController.listIngredients
);
router.post('/ingredient', verifyToken, verifyRole(...INVENTORY_ROLES), inventoryController.createIngredient);
router.patch('/ingredient/:id', verifyToken, verifyRole(...INVENTORY_ROLES), inventoryController.updateIngredient);
router.delete('/ingredient/:id', verifyToken, verifyRole(...INVENTORY_ROLES), inventoryController.deleteIngredient);

router.get(
  '/restaurant/:restaurantId/suppliers',
  verifyToken,
  verifyRole(...INVENTORY_ROLES),
  inventoryController.listSuppliers
);
router.post('/supplier', verifyToken, verifyRole(...INVENTORY_ROLES), inventoryController.createSupplier);
router.patch('/supplier/:id', verifyToken, verifyRole(...INVENTORY_ROLES), inventoryController.updateSupplier);
router.delete('/supplier/:id', verifyToken, verifyRole(...INVENTORY_ROLES), inventoryController.deleteSupplier);

router.get(
  '/menu-item/:menuItemId/recipe',
  verifyToken,
  verifyRole(...INVENTORY_ROLES),
  inventoryController.getRecipe
);
router.put(
  '/menu-item/:menuItemId/recipe',
  verifyToken,
  verifyRole(...INVENTORY_ROLES),
  inventoryController.putRecipe
);

router.post('/stock/adjust', verifyToken, verifyRole(...INVENTORY_ROLES), inventoryController.adjustStock);
router.get(
  '/restaurant/:restaurantId/transactions',
  verifyToken,
  verifyRole(...INVENTORY_ROLES),
  inventoryController.listTransactions
);

router.get(
  '/restaurant/:restaurantId/purchase-orders',
  verifyToken,
  verifyRole(...INVENTORY_ROLES),
  inventoryController.listPurchaseOrders
);
router.post('/purchase-order', verifyToken, verifyRole(...INVENTORY_ROLES), inventoryController.createPurchaseOrder);
router.patch(
  '/purchase-order/:id/receive',
  verifyToken,
  verifyRole(...INVENTORY_ROLES),
  inventoryController.receivePurchaseOrder
);

router.get(
  '/restaurant/:restaurantId/reports/consumption',
  verifyToken,
  verifyRole(...INVENTORY_ROLES),
  inventoryController.reportConsumption
);
router.get(
  '/restaurant/:restaurantId/reports/wastage',
  verifyToken,
  verifyRole(...INVENTORY_ROLES),
  inventoryController.reportWastage
);
router.get(
  '/restaurant/:restaurantId/reports/cost-analysis',
  verifyToken,
  verifyRole(...INVENTORY_ROLES),
  inventoryController.reportCostAnalysis
);

module.exports = router;
