const express = require('express');
const router = express.Router();
const { Client, Planificador, Baja } = require('../../models');
const asyncHandler = require('../../middleware/asyncHandler');
const { importFromExcel } = require('../../services/planificadorImportService');

// ============ BAJAS CRUD ============

// Generar siguiente ID de baja automáticamente
router.get('/bajas/next-id', asyncHandler(async (_req, res) => {
  const bajas = await Baja.findAll({ attributes: ['idBaja'], raw: true });
  let maxNum = 0;
  bajas.forEach(b => {
    if (b.idBaja) {
      const num = parseInt(b.idBaja.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  const nextId = `BAJA${String(maxNum + 1).padStart(2, '0')}`;
  res.json({ nextId });
}));

// Obtener nicknames de clientes activos del Planificador
router.get('/bajas/nicknames', asyncHandler(async (_req, res) => {
  // Auto-importar si está vacío
  let count = await Planificador.count();
  if (count === 0) {
    console.log('[NICKNAMES] Planificador vacío, importando desde Excel...');
    await importFromExcel();
  }

  const pantallas = await Planificador.findAll({ raw: true });
  console.log(`[NICKNAMES] Planificador: ${pantallas.length} registros`);

  // Bajas históricas para enriquecer datos
  let bajasHist = [];
  try { bajasHist = await Baja.findAll({ raw: true }); } catch(e) {}

  const nicknameMap = {};
  pantallas.forEach(p => {
    if (!p.nickname || !p.nickname.trim()) return;
    const nick = p.nickname.trim();

    const data = {
      nickname: nick,
      nombre: p.nombre || '',
      apellido: p.apellido || '',
      customerId: p.customerId || '',
      pantallas: p.pantallas || 1,
      fechaInicio: p.inicio || null,
      idPantalla: p.idPantalla || '',
      cuentaId: p.cuentaId || '',
      cuenta: p.cuenta || '',
    };

    // Tipo Plan calculado desde duración
    const dur = p.duracionPlan != null ? Math.floor(Number(p.duracionPlan)) : null;
    if (dur === 14) data.tipoPlan = 'Plan Anual';
    else if (dur === 7) data.tipoPlan = 'Plan Semestral';
    else if (dur === 1) data.tipoPlan = 'Plan Mensual';
    else if (dur != null) data.tipoPlan = 'REVISAR';

    // Tipo Pantalla derivado del número de pantallas
    const np = p.pantallas || 1;
    data.tipoPantalla = np === 1 ? 'Individual' : np <= 3 ? 'Familiar' : 'Revendedor';

    // Enriquecer con datos de bajas previas
    const hist = bajasHist.find(b => b.nickname && b.nickname.trim() === nick);
    if (hist) {
      data.sku = hist.sku || '';
      data.tipoFire = hist.tipoFire || '';
      data.tipoPlan = hist.tipoPlan || '';
      data.tipoPantalla = hist.tipoPantalla || '';
      data.cuentaDedicada = hist.cuentaDedicada || '';
      data.cortesia = hist.cortesia || '';
      data.devolucion = hist.devolucion || '';
    }

    nicknameMap[nick] = data;
  });

  const result = Object.values(nicknameMap).sort((a, b) => a.nickname.localeCompare(b.nickname));
  console.log(`[NICKNAMES] Devolviendo ${result.length} nicknames`);
  res.json(result);
}));

router.get('/bajas', asyncHandler(async (_req, res) => {
  const bajas = await Baja.findAll({
    include: [{ model: Client, as: 'client', attributes: ['id', 'name', 'email', 'phone'], required: false }],
    order: [['createdAt', 'DESC']]
  });
  res.json(bajas);
}));

router.get('/bajas/:id', asyncHandler(async (req, res) => {
  const baja = await Baja.findByPk(req.params.id, {
    include: [{ model: Client, as: 'client' }]
  });
  if (!baja) return res.status(404).json({ error: 'Baja no encontrada' });
  res.json(baja);
}));

router.post('/bajas', asyncHandler(async (req, res) => {
  const baja = await Baja.create(req.body);
  res.status(201).json(baja);
}));

router.put('/bajas/:id', asyncHandler(async (req, res) => {
  await Baja.update(req.body, { where: { id: req.params.id } });
  const baja = await Baja.findByPk(req.params.id);
  res.json(baja);
}));

router.delete('/bajas/:id', asyncHandler(async (req, res) => {
  await Baja.destroy({ where: { id: req.params.id } });
  res.json({ message: 'Baja eliminada' });
}));

module.exports = router;
