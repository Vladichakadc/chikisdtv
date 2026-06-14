const express = require('express');
const router = express.Router();
const path = require('path');
const XLSX = require('xlsx');
const { CostoPantalla } = require('../../models');
const asyncHandler = require('../../middleware/asyncHandler');

// ============ COSTO PANTALLA (DB + Excel import) ============

async function importCostoPantalla() {
  const filePath = path.join(__dirname, '../../../Tablas/Tabla_Costo_Pantalla.xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const headers = raw[0].map(h => (h || '').toString().trim());

  // Mapeo posicional basado en headers reales del Excel
  const HEADER_TO_FIELD = {
    'Id_rec':                       'idRec',
    'Accion':                       'accion',
    'Creditos':                     'creditos',
    'Fecha':                        'fecha',
    'Año':                          'anio',
    'Mes':                          'mes',
    'Item_Quantity':                 'itemQuantity',
    'Costo COP':                    'costoCOP',
    'Impuesto 4x100 COP':          'impuesto4x100COP',
    'Costo USD':                    'costoUSD',
    'TRM':                          'trm',
    'Costo Unitario Cuenta USD':    'costoUnitarioCuentaUSD',
    'Costo Unitario cuenta COP':    'costoUnitarioCuentaCOP',
    'Costo Pantalla USD':           'costoPantallaUSD',
    'Costo Pantalla COP':           'costoPantallaCOP',
    'Medio Pago':                   'medioPago',
  };

  const NUMERIC_FIELDS = [
    'creditos', 'costoCOP', 'impuesto4x100COP', 'costoUSD', 'trm',
    'costoUnitarioCuentaUSD', 'costoUnitarioCuentaCOP',
    'costoPantallaUSD', 'costoPantallaCOP'
  ];

  const records = [];
  for (const row of raw.slice(1)) {
    if (!row || row.every(cell => cell == null || cell === '')) continue;
    const record = {};
    headers.forEach((h, j) => {
      const val = row[j];
      if (val == null || val === '') return;
      const field = HEADER_TO_FIELD[h];
      if (!field) return;

      if (NUMERIC_FIELDS.includes(field)) {
        record[field] = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, '')) || null;
      } else if (field === 'itemQuantity') {
        record[field] = typeof val === 'number' ? val : parseInt(val, 10) || null;
      } else if (field === 'fecha' && typeof val === 'number') {
        record[field] = new Date(Date.UTC(1899, 11, 30) + val * 86400000).toISOString().split('T')[0];
      } else {
        record[field] = String(val).trim();
      }
    });
    records.push(record);
  }
  if (records.length > 0) await CostoPantalla.bulkCreate(records);
  return records.length;
}

router.get('/payments/costo-pantalla', asyncHandler(async (_req, res) => {
  const count = await CostoPantalla.count();
  if (count === 0) await importCostoPantalla();
  const rows = await CostoPantalla.findAll({ order: [['id', 'DESC']] });
  res.json(rows);
}));

router.get('/payments/costo-pantalla/next-id', asyncHandler(async (_req, res) => {
  const records = await CostoPantalla.findAll({ attributes: ['idRec'], raw: true });
  let maxNum = 0;
  records.forEach(r => {
    if (r.idRec) {
      const num = parseInt(r.idRec.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  res.json({ nextIdRec: `R${maxNum + 1}` });
}));

router.post('/payments/costo-pantalla/import', asyncHandler(async (_req, res) => {
  await CostoPantalla.destroy({ where: {}, truncate: true });
  const count = await importCostoPantalla();
  res.json({ message: `${count} registros de costo pantalla importados desde Excel` });
}));

router.post('/payments/costo-pantalla', asyncHandler(async (req, res) => {
  if (req.body.idRec) {
    const existing = await CostoPantalla.findOne({ where: { idRec: String(req.body.idRec).trim() } });
    if (existing) {
      return res.status(400).json({ error: `El ID Registro "${req.body.idRec}" ya existe. Por favor, utiliza uno que no esté repetido.` });
    }
  }
  const record = await CostoPantalla.create(req.body);
  res.status(201).json(record);
}));

router.put('/payments/costo-pantalla/:id', asyncHandler(async (req, res) => {
  const record = await CostoPantalla.findByPk(req.params.id);
  if (!record) return res.status(404).json({ error: 'No encontrado' });

  if (req.body.idRec) {
    const newIdRec = String(req.body.idRec).trim();
    if (newIdRec !== record.idRec) {
      const existing = await CostoPantalla.findOne({ where: { idRec: newIdRec } });
      if (existing) {
        return res.status(400).json({ error: `El ID Registro "${newIdRec}" ya existe en otro registro. Por favor elige otro.` });
      }
    }
  }

  await record.update(req.body);
  res.json(record);
}));

router.delete('/payments/costo-pantalla/:id', asyncHandler(async (req, res) => {
  const record = await CostoPantalla.findByPk(req.params.id);
  if (!record) return res.status(404).json({ error: 'No encontrado' });
  await record.destroy();
  res.json({ ok: true });
}));

module.exports = router;
