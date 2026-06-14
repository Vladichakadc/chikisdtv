const express = require('express');
const router = express.Router();
const { VentaEquipo, Client, Device } = require('../../models');
const asyncHandler = require('../../middleware/asyncHandler');
const XLSX = require('xlsx');
const path = require('path');

// ─── Función Importadora ────────────────────────────────────────────────────────

function excelDateToJSDate(serial) {
  if (!serial) return null;
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60; total_seconds /= 60;
  const minutes = Math.floor(total_seconds % 60);
  const hours = Math.floor(total_seconds / 60);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

function normalizeDate(d) {
  if (!d) return null;
  if (typeof d === 'number') {
    const jsDate = excelDateToJSDate(d);
    return jsDate ? jsDate.toISOString().split('T')[0] : null;
  }
  if (typeof d === 'string') {
    if (d.includes('/')) {
      const parts = d.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return d.split('T')[0];
  }
  return null;
}

function mapTipoFireToDeviceType(t) {
  if (!t) return 'Otro';
  t = t.toLowerCase();
  if (t.includes('tv') || t.includes('fire') || t.includes('onn') || t.includes('stick') || t.includes('cube') || t.includes('pantalla')) return 'Smart TV';
  if (t.includes('pc') || t.includes('computador')) return 'PC';
  if (t.includes('celular') || t.includes('phone')) return 'Celular';
  if (t.includes('tablet')) return 'Tablet';
  return 'Otro';
}

async function importVentasEquipos() {
  const filepath = path.join(__dirname, '..', '..', '..', 'Tablas', '1-orders_table_Ventas_Firetv2024.xlsx');
  let wb;
  try {
    wb = XLSX.readFile(filepath);
  } catch (e) {
    console.error('[IMPORT EXCEL] Error leyendo 1-orders_table_Ventas_Firetv2024.xlsx:', e.message);
    return 0;
  }
  
  const sheetName = wb.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
  
  if (data.length <= 1) return 0;
  
  const records = [];
  // Estructura real de la hoja "Venta Fire TV" (13 columnas):
  // 0 Id_vnta | 1 Customer_id | 2 Accion | 3 SKU | 4 TIPO DE FIRE | 5 Nickname |
  // 6 Fecha | 7 Año | 8 Mes | 9 Precio Venta Firetv | 10 Item_Quantity | 11 Costo | 12 Serial
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] && !row[1]) continue;

    records.push({
      idVM:           String(row[0] || `FVM-${Date.now()}-${i}`),
      customerId:     row[1] != null ? String(row[1]) : null,
      tipoPago:       row[2] ? String(row[2]).trim() : null,   // "Venta"
      sku:            row[3] || null,
      tipoFire:       row[4] || null,
      nickname:       row[5] || null,
      fecha:          normalizeDate(row[6]),
      anio:           row[7] != null ? String(row[7]) : null,
      mes:            row[8] || null,
      precioVenta:    row[9] != null ? Number(row[9]) : null,
      itemQuantity:   row[10] != null ? Number(row[10]) : null,
      costo:          row[11] != null ? Number(row[11]) : null,
      serial:         row[12] != null ? String(row[12]) : null,
      // El Excel no trae estos campos: se completan luego desde el Planificador / formulario
      estado:         'Activo',
      idPantalla:     null,
      cuentaId:       null,
      pantallas:      1,
    });
  }

  await VentaEquipo.destroy({ where: {} });
  await VentaEquipo.bulkCreate(records, { ignoreDuplicates: true });
  console.log(`[IMPORT EXCEL] Importados ${records.length} registros de Ventas FireTV`);
  return records.length;
}

// ─── Helpers CRUD ─────────────────────────────────────────────────────────────

const EQUIPO_STRING_FIELDS = [
  'idVM', 'customerId', 'nombre', 'apellido', 'sku', 'tipoFire', 'idPantalla', 'serial',
  'nickname', 'cuentaId', 'cuenta', 'estado', 'cortesia', 'anio', 'mes', 'medioPago',
  'tipoPago', 'tipoPlan', 'tipoPantalla', 'cuentaDedicada',
];
const EQUIPO_INT_FIELDS = ['pantallas', 'itemQuantity'];
const EQUIPO_FLOAT_FIELDS = ['precioVenta', 'costo'];
const EQUIPO_DATE_FIELDS = ['fecha', 'fechaAlta'];

function sanitizeVentaBody(body) {
  const d = {};
  for (const f of EQUIPO_STRING_FIELDS) {
    if (body[f] === undefined) continue;
    d[f] = (body[f] ?? '').toString().trim() || null;
  }
  for (const f of EQUIPO_INT_FIELDS) {
    if (body[f] === undefined) continue;
    d[f] = body[f] !== '' && body[f] != null ? parseInt(body[f], 10) : null;
  }
  for (const f of EQUIPO_FLOAT_FIELDS) {
    if (body[f] === undefined) continue;
    d[f] = body[f] !== '' && body[f] != null ? Number(body[f]) : null;
  }
  for (const f of EQUIPO_DATE_FIELDS) {
    if (body[f] === undefined) continue;
    d[f] = (body[f] || '').toString().trim() || null;
  }

  // Auto-calcular año y mes a partir de la fecha (YYYY-MM-DD)
  if (d.fecha) {
    const parts = d.fecha.split('-');
    if (parts.length === 3) {
      d.anio = parts[0];
      const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const mi = parseInt(parts[1], 10) - 1;
      if (mi >= 0 && mi < 12) d.mes = months[mi];
    }
  }
  return d;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

router.get('/payments/ventas-equipos/next-id', asyncHandler(async (_req, res) => {
  const all = await VentaEquipo.findAll({ attributes: ['idVM'] });
  const nums = all.map(v => parseInt(v.idVM?.replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  res.json({ nextId: `FVM${next}` });
}));

router.post('/payments/ventas-equipos/import', asyncHandler(async (_req, res) => {
  const count = await importVentasEquipos();
  res.json({ imported: count });
}));

router.get('/payments/ventas-equipos', asyncHandler(async (_req, res) => {
  const count = await VentaEquipo.count();
  if (count === 0) await importVentasEquipos();
  const rows = await VentaEquipo.findAll({ order: [['fecha', 'DESC']] });
  res.json(rows);
}));

router.post('/payments/ventas-equipos', asyncHandler(async (req, res) => {
  const data = sanitizeVentaBody(req.body);
  if (!data.idVM) return res.status(400).json({ error: 'El ID de Venta (idVM) es obligatorio' });
  const venta = await VentaEquipo.create(data);

  if (data.customerId) {
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

router.put('/payments/ventas-equipos/:idVM', asyncHandler(async (req, res) => {
  const venta = await VentaEquipo.findByPk(req.params.idVM);
  if (!venta) return res.status(404).json({ error: 'No encontrado' });
  const data = sanitizeVentaBody(req.body);
  delete data.idVM;
  await venta.update(data);
  res.json(venta);
}));

router.delete('/payments/ventas-equipos/:idVM', asyncHandler(async (req, res) => {
  const venta = await VentaEquipo.findByPk(req.params.idVM);
  if (!venta) return res.status(404).json({ error: 'No encontrado' });
  await venta.destroy();
  res.json({ ok: true });
}));

module.exports = router;
