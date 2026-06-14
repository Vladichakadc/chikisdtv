const express = require('express');
const router = express.Router();
const { Client, Plan, Subscription, Payment } = require('../../models');
const asyncHandler = require('../../middleware/asyncHandler');

// ============ PAYMENTS CRUD ============
router.get('/payments', asyncHandler(async (_req, res) => {
  const payments = await Payment.findAll({
    include: [
      { model: Client, as: 'client', attributes: ['id', 'name', 'email'] },
      { model: Subscription, as: 'subscription', include: [{ model: Plan, as: 'plan' }] }
    ],
    order: [['fechaPago', 'DESC']]
  });
  res.json(payments);
}));

router.post('/payments', asyncHandler(async (req, res) => {
  const payment = await Payment.create(req.body);
  res.status(201).json(payment);
}));

router.put('/payments/:id', asyncHandler(async (req, res) => {
  await Payment.update(req.body, { where: { id: req.params.id } });
  const payment = await Payment.findByPk(req.params.id);
  res.json(payment);
}));

router.delete('/payments/:id', asyncHandler(async (req, res) => {
  await Payment.destroy({ where: { id: req.params.id } });
  res.json({ message: 'Pago eliminado' });
}));

module.exports = router;
