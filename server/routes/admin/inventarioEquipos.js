const express = require('express');
const router = express.Router();
const path = require('path');
const XLSX = require('xlsx');
const { Op } = require('sequelize');
const { InventarioEquipo, VentaEquipo, CostoPantalla } = require('../../models');
const asyncHandler = require('../../middleware/asyncHandler');

function excelSerial(n) {
  if (typeof n !== 'number') return n || null;
  return new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().split('T')[0];
}

const num = (v) => (v != null && v !== '' ? Number(v) : null);
const str = (v) => {
  const s = (v ?? '').toString().trim();
  return s || null;
};

// Importa Tablas/order_inventario2026.xlsx REEMPLAZANDO todo el contenido de
// inventario_equipos: el Excel es la fuente de verdad de este lote de compra.
async function importInventario() {
  const filePath = path.join(__dirname, '../../../Tablas/order_inventario2026.xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const records = raw.slice(1)
    .filter(row => row[0])
    .map(row => ({
      idInventario:     String(row[0]).trim(),
      fechaCompra:      excelSerial(row[1]),
      descripcion:      str(row[2]),
      proveedor:        str(row[3]),
      serie:            str(row[4]),
      costoUnitarioUSD: num(row[5]),
      envioUSD:         num(row[6]),
      impuestosUSD:     num(row[7]),
      transporteCOP:    num(row[8]),
      cantidad:         num(row[9]),
      totalUSD:         num(row[10]),
      trm:              num(row[11]),
      costoUniCOP:      num(row[12]),
      costoTotalCOP:    num(row[13]),
      // El Excel trae la utilidad como fracción (0.1818…) — se guarda como porcentaje
      utilidadPct:      row[14] != null && row[14] !== '' ? Number((Number(row[14]) * 100).toFixed(2)) : null,
      precioSugerido:   num(row[15]),
      ganancia:         num(row[16]),
      estado:           str(row[17]) || 'En Bodega',
    }));

  await InventarioEquipo.destroy({ where: {} });
  await InventarioEquipo.bulkCreate(records);
  return records.length;
}

// GET /inventario-equipos — lista el inventario físico con su venta asociada
// (serie ↔ VentaEquipo.serial); auto-importa desde el Excel si la tabla está vacía.
router.get('/inventario-equipos', asyncHandler(async (_req, res) => {
  const count = await InventarioEquipo.count();
  if (count === 0) await importInventario();
  const items = await InventarioEquipo.findAll({
    include: [{
      model: VentaEquipo,
      as: 'venta',
      attributes: ['idVM', 'customerId', 'nombre', 'apellido', 'nickname', 'fecha', 'precioVenta'],
    }],
    order: [['idInventario', 'ASC']],
  });
  res.json(items);
}));

// POST /inventario-equipos/import — fuerza la recarga desde el Excel (reemplaza todo)
router.post('/inventario-equipos/import', asyncHandler(async (_req, res) => {
  const count = await importInventario();
  res.json({ message: `${count} equipos importados desde order_inventario2026.xlsx` });
}));

// ─── CRUD manual ────────────────────────────────────────────────────────────

const INV_STR_FIELDS  = ['descripcion', 'proveedor', 'serie', 'estado'];
const INV_NUM_FIELDS  = ['costoUnitarioUSD', 'envioUSD', 'impuestosUSD', 'transporteCOP', 'cantidad', 'totalUSD', 'trm', 'costoUniCOP', 'precioSugerido'];
const INV_DATE_FIELDS = ['fechaCompra'];

function sanitizeInventarioBody(body) {
  const out = {};
  for (const f of INV_STR_FIELDS)  if (body[f] !== undefined) out[f] = str(body[f]);
  for (const f of INV_NUM_FIELDS)  if (body[f] !== undefined) out[f] = num(body[f]);
  for (const f of INV_DATE_FIELDS) if (body[f] !== undefined) out[f] = str(body[f]);
  return out;
}

// Los campos financieros derivados se calculan siempre en el servidor a partir
// de costo unitario, cantidad y precio sugerido — la misma aritmética del Excel
// (utilidad = margen sobre costo). Así un PUT parcial nunca los deja inconsistentes.
function calcularDerivados(rec) {
  const costoUni = Number(rec.costoUniCOP) || 0;
  const cantidad = Number(rec.cantidad) || 1;
  const precio   = Number(rec.precioSugerido) || 0;
  const derivados = { costoTotalCOP: costoUni * cantidad };
  if (costoUni > 0 && precio > 0) {
    derivados.utilidadPct = Number((((precio - costoUni) / costoUni) * 100).toFixed(2));
    derivados.ganancia    = (precio - costoUni) * cantidad;
  } else {
    derivados.utilidadPct = null;
    derivados.ganancia    = null;
  }
  return derivados;
}

// Catálogo de referencias para el formulario: las que ya existen en el
// inventario y en el histórico de ventas de equipos, más las más conocidas
// del mercado de TV boxes/sticks en Colombia.
const REFERENCIAS_CONOCIDAS = [
  'Fire TV HD', 'Fire TV LITE', 'Fire TV 4K', 'Fire TV 4K MAX', 'Fire TV Cube',
  'Watch ONN 4K Original', 'Watch ONN 4K China', 'Watch ONN HD Original',
  'Xiaomi TV Stick 4K', 'Xiaomi TV Box S',
  'Chromecast con Google TV', 'Roku Express 4K', 'Roku Streaming Stick', 'Apple TV 4K',
];

// Variantes retiradas del selector por ser similares al catálogo Watch ONN
// (siguen existiendo en registros históricos, pero no se ofrecen para equipos nuevos)
const REFERENCIAS_EXCLUIDAS = new Set(['watch-onn-china', 'onn tv box 4k', 'onn streaming stick']);

router.get('/inventario-equipos/referencias', asyncHandler(async (_req, res) => {
  const [inv, ventas] = await Promise.all([
    InventarioEquipo.findAll({ attributes: ['descripcion'], raw: true }),
    VentaEquipo.findAll({ attributes: ['tipoFire'], raw: true }),
  ]);
  const vistas = new Set();
  const referencias = [];
  for (const nombre of [
    ...inv.map(r => r.descripcion),
    ...ventas.map(r => r.tipoFire),
    ...REFERENCIAS_CONOCIDAS,
  ]) {
    const limpio = (nombre || '').trim();
    if (!limpio) continue;
    const clave = limpio.toLowerCase();
    if (vistas.has(clave) || REFERENCIAS_EXCLUIDAS.has(clave)) continue;
    vistas.add(clave);
    referencias.push(limpio);
  }
  res.json({ referencias: referencias.sort((a, b) => a.localeCompare(b, 'es')) });
}));

// TRM del día: fuente oficial (Superfinanciera vía datos.gov.co); si no hay
// internet cae al último TRM registrado en Costo Pantalla.
router.get('/inventario-equipos/trm', asyncHandler(async (_req, res) => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch('https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20DESC', { signal: ctrl.signal });
    clearTimeout(timer);
    if (r.ok) {
      const [row] = await r.json();
      const valor = Number(row?.valor);
      if (valor > 0) {
        return res.json({ trm: valor, fuente: 'datos.gov.co (oficial)', vigencia: String(row.vigenciadesde || '').slice(0, 10) });
      }
    }
  } catch { /* sin conexión: usar el respaldo local */ }
  const ult = await CostoPantalla.findOne({
    where: { trm: { [Op.gt]: 0 } },
    order: [['anio', 'DESC'], ['id', 'DESC']],
    raw: true,
  });
  if (ult) return res.json({ trm: Number(ult.trm), fuente: 'último registro de Costo Pantalla', vigencia: `${ult.mes} ${ult.anio}` });
  res.json({ trm: null, fuente: null, vigencia: null });
}));

// Fórmula de importación del negocio:
// costoUniCOP = (USD unitario + envío USD + impuestos USD) × TRM + transporte COP
function costoCOPDesdeUSD(rec) {
  const usd = (Number(rec.costoUnitarioUSD) || 0) + (Number(rec.envioUSD) || 0) + (Number(rec.impuestosUSD) || 0);
  const trm = Number(rec.trm) || 0;
  if (usd > 0 && trm > 0) return Math.round(usd * trm + (Number(rec.transporteCOP) || 0));
  return null;
}

// Siguiente consecutivo "inNNN" para prellenar el formulario de nuevo equipo
router.get('/inventario-equipos/next-id', asyncHandler(async (_req, res) => {
  const rows = await InventarioEquipo.findAll({ attributes: ['idInventario'], raw: true });
  const max = rows.reduce((m, r) => {
    const n = parseInt(String(r.idInventario).replace(/^in/i, ''), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  res.json({ nextId: `in${String(max + 1).padStart(3, '0')}` });
}));

router.post('/inventario-equipos', asyncHandler(async (req, res) => {
  const data = sanitizeInventarioBody(req.body);
  const idInventario = str(req.body.idInventario);
  if (!idInventario) return res.status(400).json({ error: 'El ID de inventario es obligatorio' });
  if (!data.descripcion) return res.status(400).json({ error: 'La descripción es obligatoria' });
  const existe = await InventarioEquipo.findByPk(idInventario);
  if (existe) return res.status(409).json({ error: `Ya existe un equipo con el ID "${idInventario}"` });
  if (data.cantidad == null) data.cantidad = 1;
  if (!data.estado) data.estado = 'En Bodega';
  if (data.costoUniCOP == null) {
    const auto = costoCOPDesdeUSD(data);
    if (auto != null) data.costoUniCOP = auto;
  }
  const item = await InventarioEquipo.create({ idInventario, ...data, ...calcularDerivados(data) });
  res.status(201).json(item);
}));

router.put('/inventario-equipos/:idInventario', asyncHandler(async (req, res) => {
  const item = await InventarioEquipo.findByPk(req.params.idInventario);
  if (!item) return res.status(404).json({ error: 'Equipo no encontrado' });
  const data = sanitizeInventarioBody(req.body);
  const merged = { ...item.toJSON(), ...data };
  await item.update({ ...data, ...calcularDerivados(merged) });
  const updated = await InventarioEquipo.findByPk(req.params.idInventario, {
    include: [{ model: VentaEquipo, as: 'venta', attributes: ['idVM', 'customerId', 'nombre', 'apellido', 'nickname', 'fecha', 'precioVenta'] }],
  });
  res.json(updated);
}));

router.delete('/inventario-equipos/:idInventario', asyncHandler(async (req, res) => {
  const item = await InventarioEquipo.findByPk(req.params.idInventario);
  if (!item) return res.status(404).json({ error: 'Equipo no encontrado' });
  await item.destroy();
  res.json({ message: `Equipo ${req.params.idInventario} eliminado del inventario` });
}));

module.exports = router;
