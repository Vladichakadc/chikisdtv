const express = require('express');
const router = express.Router();
const path = require('path');
const XLSX = require('xlsx');
const { Venta, Client, Device } = require('../../models');
const asyncHandler = require('../../middleware/asyncHandler');

function excelSerial(n) {
  if (typeof n !== 'number') return n || null;
  return new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().split('T')[0];
}

// "Cambio de Plan" (valor histórico del Excel) cuenta como renovación en el
// negocio: la BD se normalizó el 2026-07-02 y ni un reimport del .xlsx ni una
// venta creada por API deben reintroducirlo.
function normalizeTipoPago(v) {
  if (!v) return v;
  return /^cambio de plan$/i.test(String(v).trim()) ? 'Renovacion' : v;
}

async function importVentas() {
  const filePath = path.join(__dirname, '../../../Tablas/1-orders_table_Ventas_LicenciaIPVT2024.xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const records = raw.slice(1)
    .filter(row => row[0])
    .map(row => ({
      idVM:           String(row[0]),
      customerId:     row[1]  != null ? String(row[1])  : null,
      nombre:         row[2]  || null,
      apellido:       row[3]  || null,
      sku:            row[4]  || null,
      tipoFire:       row[5]  || null,
      idPantalla:     row[6]  || null,
      nickname:       row[7]  || null,
      cuentaId:       row[8]  || null,
      cuenta:         row[9]  || null,
      estado:         row[10] || null,
      cortesia:       row[11] || null,
      pantallas:      row[12] != null ? Number(row[12]) : null,
      fechaAlta:      excelSerial(row[13]),
      fecha:          excelSerial(row[14]),
      anio:           row[15] != null ? String(row[15]) : null,
      mes:            row[16] || null,
      precioVenta:    row[17] != null ? Number(row[17]) : null,
      medioPago:      row[18] || null,
      itemQuantity:   row[19] != null ? Number(row[19]) : null,
      tipoPago:       normalizeTipoPago(row[20]) || null,
      tipoPlan:       row[21] || null,
      tipoPantalla:   row[22] || null,
      cuentaDedicada: row[23] || null,
    }));
  await Venta.bulkCreate(records, {
    updateOnDuplicate: [
      'customerId','nombre','apellido','sku','tipoFire','idPantalla','nickname',
      'cuentaId','cuenta','estado','cortesia','pantallas','fechaAlta','fecha',
      'anio','mes','precioVenta','medioPago','itemQuantity','tipoPago',
      'tipoPlan','tipoPantalla','cuentaDedicada','updatedAt',
    ],
  });
  return records.length;
}

// Sanea el body del formulario "Nueva Venta" antes de persistirlo: recorta espacios en
// los campos de texto y convierte cadenas vacías a null en campos numéricos/fecha
// (evita que SQLite guarde "Invalid date" o "" en columnas DATEONLY/INTEGER/FLOAT).
const VENTA_STRING_FIELDS = [
  'idVM', 'customerId', 'nombre', 'apellido', 'sku', 'tipoFire', 'idPantalla', 'nickname',
  'cuentaId', 'cuenta', 'estado', 'cortesia', 'anio', 'mes', 'medioPago', 'tipoPago',
  'tipoPlan', 'tipoPantalla', 'cuentaDedicada',
];
const VENTA_INT_FIELDS = ['pantallas', 'itemQuantity'];
const VENTA_FLOAT_FIELDS = ['precioVenta'];
const VENTA_DATE_FIELDS = ['fecha', 'fechaAlta'];

function sanitizeVentaBody(body) {
  const out = {};
  for (const f of VENTA_STRING_FIELDS) {
    if (body[f] === undefined) continue;
    const trimmed = (body[f] ?? '').toString().trim();
    out[f] = trimmed || null;
  }
  for (const f of VENTA_INT_FIELDS) {
    if (body[f] === undefined) continue;
    out[f] = body[f] !== '' && body[f] != null ? parseInt(body[f], 10) : null;
  }
  for (const f of VENTA_FLOAT_FIELDS) {
    if (body[f] === undefined) continue;
    out[f] = body[f] !== '' && body[f] != null ? Number(body[f]) : null;
  }
  for (const f of VENTA_DATE_FIELDS) {
    if (body[f] === undefined) continue;
    out[f] = (body[f] || '').toString().trim() || null;
  }
  if (out.tipoPago) out.tipoPago = normalizeTipoPago(out.tipoPago);

  // Auto-calcular año desde la fecha siempre que venga; mes solo si el usuario
  // no lo eligió explícitamente (el formulario permite que fecha y mes sean independientes,
  // p.ej. cuando un socio paga en diciembre pero el mes facturado es enero).
  if (out.fecha) {
    const parts = out.fecha.split('-');
    if (parts.length === 3) {
      out.anio = parts[0];
      const mesExplicito = (body.mes || '').toString().trim();
      if (!mesExplicito) {
        const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const monthIndex = parseInt(parts[1], 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) out.mes = meses[monthIndex];
      }
    }
  }

  return out;
}

function mapTipoFireToDeviceType(tipoFire) {
  if (!tipoFire) return 'Otro';
  const t = tipoFire.toLowerCase();
  if (t.includes('tv') || t.includes('fire') || t.includes('onn') || t.includes('stick') || t.includes('cube') || t.includes('pantalla')) return 'Smart TV';
  if (t.includes('pc') || t.includes('computador')) return 'PC';
  if (t.includes('celular') || t.includes('phone')) return 'Celular';
  if (t.includes('tablet')) return 'Tablet';
  return 'Otro';
}

// ============ VENTAS LICENCIA CRUD ============
router.get('/payments/ventas-licencia/next-id', asyncHandler(async (_req, res) => {
  const all = await Venta.findAll({ attributes: ['idVM'] });
  const nums = all.map(v => parseInt(v.idVM?.replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  res.json({ nextId: `VM${next}` });
}));

router.post('/payments/ventas-licencia/import', asyncHandler(async (_req, res) => {
  const count = await importVentas();
  res.json({ imported: count });
}));

router.get('/payments/ventas-licencia', asyncHandler(async (_req, res) => {
  const count = await Venta.count();
  if (count === 0) await importVentas();
  const rows = await Venta.findAll({ order: [['fecha', 'DESC']] });
  res.json(rows);
}));

router.get('/payments/ventas-dispositivos', asyncHandler(async (_req, res) => {
  const count = await Venta.count();
  if (count === 0) await importVentas();
  
  const { Op } = require('sequelize');
  const rows = await Venta.findAll({
    where: {
      [Op.or]: [
        { tipoPago: { [Op.like]: '%Activacion%' } },
        { tipoPago: { [Op.like]: '%Activación%' } },
        { tipoPago: { [Op.like]: '%Pantalla%' } },
        { tipoFire: { [Op.not]: null, [Op.ne]: '' } }
      ]
    },
    order: [['fecha', 'DESC']]
  });
  res.json(rows);
}));

router.post('/payments/ventas-licencia', asyncHandler(async (req, res) => {
  const data = sanitizeVentaBody(req.body);
  if (!data.idVM) return res.status(400).json({ error: 'El ID de Venta (idVM) es obligatorio' });
  const venta = await Venta.create(data);

  if ((data.tipoPago === 'Activacion Pantalla' || data.tipoPago === 'Activacion') && data.customerId) {
    const client = await Client.findOne({ where: { customerId: data.customerId } });
    if (client) {
      const macOId = data.idPantalla || data.nickname || `UNKNOWN-${Date.now()}`;
      await Device.findOrCreate({
        where: { mac: macOId },
        defaults: {
          clientId: client.id,
          nombre: data.nickname || data.idPantalla || 'Dispositivo Nuevo',
          tipo: mapTipoFireToDeviceType(data.tipoFire),
          mac: macOId,
          activo: data.estado !== 'Desactivado' && data.estado !== 'Baja'
        }
      });
    }
  }

  res.status(201).json(venta);
}));

router.put('/payments/ventas-licencia/:idVM', asyncHandler(async (req, res) => {
  const venta = await Venta.findByPk(req.params.idVM);
  if (!venta) return res.status(404).json({ error: 'No encontrado' });
  const data = sanitizeVentaBody(req.body);
  delete data.idVM; // la PK no se modifica desde el formulario de edición
  await venta.update(data);
  res.json(venta);
}));

router.delete('/payments/ventas-licencia/:idVM', asyncHandler(async (req, res) => {
  const venta = await Venta.findByPk(req.params.idVM);
  if (!venta) return res.status(404).json({ error: 'No encontrado' });
  await venta.destroy();
  res.json({ ok: true });
}));

module.exports = router;
