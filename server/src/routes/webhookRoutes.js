const express = require('express');
const orderController = require('../controllers/orderController');

const router = express.Router();

function verifyPartnerSecret(secretEnvKey) {
  return (req, res, next) => {
    const expected = process.env[secretEnvKey] || process.env.WEBHOOK_SHARED_SECRET;
    if (!expected) {
      return res.status(503).json({ success: false, message: 'Webhook not configured (set env secret)' });
    }
    const auth = req.headers.authorization || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const headerSecret = req.headers['x-webhook-secret'];
    const token = bearer || (typeof headerSecret === 'string' ? headerSecret : '');
    if (token !== expected) {
      return res.status(401).json({ success: false, message: 'Invalid webhook authentication' });
    }
    next();
  };
}

router.post('/swiggy', verifyPartnerSecret('WEBHOOK_SWIGGY_SECRET'), (req, res) =>
  orderController.createFromPartnerWebhook(req, res, 'SWIGGY')
);

router.post('/zomato', verifyPartnerSecret('WEBHOOK_ZOMATO_SECRET'), (req, res) =>
  orderController.createFromPartnerWebhook(req, res, 'ZOMATO')
);

module.exports = router;
