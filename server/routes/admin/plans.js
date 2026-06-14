const express = require('express');
const router = express.Router();
const { Plan } = require('../../models');
const asyncHandler = require('../../middleware/asyncHandler');

// ============ PLANS CRUD ============
router.get('/plans', asyncHandler(async (_req, res) => {
  const plans = await Plan.findAll({ order: [['precio', 'ASC']] });
  res.json(plans);
}));

router.post('/plans', asyncHandler(async (req, res) => {
  const plan = await Plan.create(req.body);
  res.status(201).json(plan);
}));

router.put('/plans/:id', asyncHandler(async (req, res) => {
  await Plan.update(req.body, { where: { id: req.params.id } });
  const plan = await Plan.findByPk(req.params.id);
  res.json(plan);
}));

router.delete('/plans/:id', asyncHandler(async (req, res) => {
  await Plan.destroy({ where: { id: req.params.id } });
  res.json({ message: 'Plan eliminado' });
}));

module.exports = router;
