const express = require('express');
const router = express.Router();
const { Client, Plan, Subscription, Payment, Device } = require('../models');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

// GET /api/user/me - profile
router.get('/me', async (req, res) => {
  try {
    const client = await Client.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/my-subscriptions
router.get('/my-subscriptions', async (req, res) => {
  try {
    const subs = await Subscription.findAll({
      where: { clientId: req.user.id },
      include: [{ model: Plan, as: 'plan' }],
      order: [['fechaVencimiento', 'DESC']]
    });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/my-payments
router.get('/my-payments', async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { clientId: req.user.id },
      include: [{ model: Subscription, as: 'subscription', include: [{ model: Plan, as: 'plan' }] }],
      order: [['fechaPago', 'DESC']]
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/my-devices
router.get('/my-devices', async (req, res) => {
  try {
    const devices = await Device.findAll({
      where: { clientId: req.user.id },
      include: [{ model: Subscription, as: 'subscription', include: [{ model: Plan, as: 'plan' }] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/my-summary
router.get('/my-summary', async (req, res) => {
  try {
    const activeSub = await Subscription.findOne({
      where: { clientId: req.user.id, estado: 'Activo' },
      include: [{ model: Plan, as: 'plan' }],
      order: [['fechaVencimiento', 'DESC']]
    });
    const pendingPayments = await Payment.count({ where: { clientId: req.user.id, estado: 'Pendiente' } });
    const totalDevices = await Device.count({ where: { clientId: req.user.id, activo: true } });
    const totalPagado = await Payment.sum('monto', { where: { clientId: req.user.id, estado: 'Pagado' } });
    res.json({ activeSub, pendingPayments, totalDevices, totalPagado: totalPagado || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
