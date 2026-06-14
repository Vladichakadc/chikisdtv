const express = require('express');
const router = express.Router();
const { Client, Plan, Subscription, Device } = require('../../models');
const asyncHandler = require('../../middleware/asyncHandler');

// ============ DEVICES CRUD ============
router.get('/devices', asyncHandler(async (_req, res) => {
  const devices = await Device.findAll({
    include: [
      { model: Client, as: 'client', attributes: ['id', 'name', 'email'] },
      { model: Subscription, as: 'subscription', include: [{ model: Plan, as: 'plan' }] }
    ],
    order: [['createdAt', 'DESC']]
  });
  res.json(devices);
}));

router.post('/devices', asyncHandler(async (req, res) => {
  const device = await Device.create(req.body);
  res.status(201).json(device);
}));

router.put('/devices/:id', asyncHandler(async (req, res) => {
  await Device.update(req.body, { where: { id: req.params.id } });
  const device = await Device.findByPk(req.params.id);
  res.json(device);
}));

router.delete('/devices/:id', asyncHandler(async (req, res) => {
  await Device.destroy({ where: { id: req.params.id } });
  res.json({ message: 'Dispositivo eliminado' });
}));

module.exports = router;
