const express = require('express');
const router = express.Router();
const { Setting } = require('../../models');
const asyncHandler = require('../../middleware/asyncHandler');

// ============ SETTINGS (clave/valor genérico) ============

// GET /admin/settings/:key
router.get('/settings/:key', asyncHandler(async (req, res) => {
  const row = await Setting.findByPk(req.params.key);
  res.json({ key: req.params.key, value: row ? row.value : null });
}));

// PUT /admin/settings/:key
router.put('/settings/:key', asyncHandler(async (req, res) => {
  const { value } = req.body;
  if (value === undefined || value === null || value === '') {
    return res.status(400).json({ error: 'El valor es requerido' });
  }
  await Setting.upsert({ key: req.params.key, value: String(value) });
  res.json({ key: req.params.key, value: String(value) });
}));

module.exports = router;
