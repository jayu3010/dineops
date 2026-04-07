const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

router.get('/', planController.getAllPlans);
router.post('/', verifyToken, verifyRole('SUPERADMIN'), planController.createPlan);
router.put('/:id', verifyToken, verifyRole('SUPERADMIN'), planController.updatePlan);
router.delete('/:id', verifyToken, verifyRole('SUPERADMIN'), planController.deletePlan);

module.exports = router;
