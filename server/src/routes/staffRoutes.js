const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, verifyRole('ADMIN', 'SUPERADMIN'), staffController.listStaff);
router.post('/', verifyToken, verifyRole('ADMIN', 'SUPERADMIN'), staffController.createStaff);
router.patch('/:id/role', verifyToken, verifyRole('ADMIN', 'SUPERADMIN'), staffController.updateStaffRole);
router.delete('/:id', verifyToken, verifyRole('ADMIN', 'SUPERADMIN'), staffController.deleteStaff);

module.exports = router;
