const express = require('express');
const router = express.Router();
const { Client, Plan, Subscription } = require('../../models');
const asyncHandler = require('../../middleware/asyncHandler');

// ============ SUBSCRIPTIONS CRUD ============
router.get('/subscriptions', asyncHandler(async (_req, res) => {
  const subs = await Subscription.findAll({
    include: [
      { model: Client, as: 'client', attributes: ['id', 'name', 'email', 'phone'] },
      { model: Plan, as: 'plan' }
    ],
    order: [['fechaVencimiento', 'ASC']]
  });
  res.json(subs);
}));

router.post('/subscriptions', asyncHandler(async (req, res) => {
  const { clientId, planId, fechaInicio } = req.body;
  if (!clientId || !planId || !fechaInicio) {
    return res.status(400).json({ error: 'clientId, planId y fechaInicio son requeridos' });
  }
  const plan = await Plan.findByPk(planId);
  if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

  const inicio = new Date(fechaInicio);
  const vencimiento = new Date(inicio.getTime() + (plan.duracionDias || 30) * 24 * 60 * 60 * 1000);

  const sub = await Subscription.create({
    ...req.body,
    fechaVencimiento: req.body.fechaVencimiento || vencimiento.toISOString().split('T')[0]
  });
  res.status(201).json(sub);
}));

router.put('/subscriptions/:id', asyncHandler(async (req, res) => {
  await Subscription.update(req.body, { where: { id: req.params.id } });
  const sub = await Subscription.findByPk(req.params.id, {
    include: [{ model: Client, as: 'client' }, { model: Plan, as: 'plan' }]
  });
  res.json(sub);
}));

router.delete('/subscriptions/:id', asyncHandler(async (req, res) => {
  await Subscription.destroy({ where: { id: req.params.id } });
  res.json({ message: 'Suscripción eliminada' });
}));

module.exports = router;
