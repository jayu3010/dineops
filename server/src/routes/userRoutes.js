const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// SuperAdmin only routes
router.get('/', verifyToken, verifyRole('SUPERADMIN'), userController.getAllUsers);
router.post('/', verifyToken, verifyRole('SUPERADMIN'), userController.createUser);
router.patch('/:id/role', verifyToken, verifyRole('SUPERADMIN'), userController.updateUserRole);
router.patch('/:id/verify', verifyToken, verifyRole('SUPERADMIN'), userController.toggleUserVerification);
router.delete('/:id', verifyToken, verifyRole('SUPERADMIN'), userController.deleteUser);

module.exports = router;
