const express = require('express');
const router = express.Router();
const { VentaEquipo, Client, Device, TablaCliente } = require('../../models');
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

// Regla de negocio: la garantía cubre 1 año desde la fecha de venta.
// Se calcula siempre a partir de `fecha` (no se acepta valor manual) para que
// una venta que cumpla el año pase sola de SI a NO.
function computeGarantia(fecha) {
  if (!fecha) return 'NO';
  const f = new Date(fecha);
  if (isNaN(f.getTime())) return 'NO';
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - 1);
  return f >= limite ? 'SI' : 'NO';
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
    console.error('[IMPORT EXCEL] Error leyendo order_inventario2026.xlsx:', e.message);
    return 0; // Abort early so we don't wipe the DB
  }
  
  let data = [];
  for (const name of wb.SheetNames) {
    const sheetData = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
    if (sheetData.length > 1 && sheetData[0]) {
      const headerStr = sheetData[0].map(String).join(' ').toLowerCase();
      if (headerStr.includes('vnta') || headerStr.includes('customer') || headerStr.includes('fecha') || headerStr.includes('fire')) {
        data = sheetData;
        break;
      }
    }
  }
  
  if (data.length === 0 && wb.SheetNames.length > 0) {
    data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  }
  
  if (data.length <= 1) return 0;
  
  // Mapa customerId → { nombre, apellido } para enriquecer cada venta con los
  // datos del cliente (asociación VentaEquipo ↔ TablaCliente por customerId).
  const clientes = await TablaCliente.findAll({ attributes: ['customerId', 'nombre', 'apellido'], raw: true });
  const clientesById = new Map(clientes.map(c => [String(c.customerId).trim(), c]));

  const records = [];
  // Estructura real de la hoja "Venta Fire TV" (14 columnas):
  // 0 Id_vnta | 1 Customer_id | 2 Accion | 3 SKU | 4 TIPO DE FIRE | 5 Nickname |
  // 6 Fecha | 7 Año | 8 Mes | 9 Precio Venta Firetv | 10 Item_Quantity | 11 Costo | 12 Serial | 13 Garantia
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] && !row[1]) continue;

    const customerId = row[1] != null ? String(row[1]).trim() : null;
    const cliente = customerId ? clientesById.get(customerId) : null;
    const fecha = normalizeDate(row[6]);

    records.push({
      idVM:           String(row[0] || `FVM-${Date.now()}-${i}`),
      customerId,
      nombre:         cliente?.nombre || null,
      apellido:       cliente?.apellido || null,
      tipoPago:       row[2] ? String(row[2]).trim() : null,   // "Venta"
      sku:            row[3] || null,
      tipoFire:       row[4] || null,
      nickname:       row[5] || null,
      fecha,
      anio:           row[7] != null ? String(row[7]) : null,
      mes:            row[8] || null,
      precioVenta:    row[9] != null ? Math.round(Number(row[9])) : null,
      itemQuantity:   row[10] != null ? Number(row[10]) : null,
      // El Excel trae costos con decimales largos (fórmulas de prorrateo);
      // en COP se manejan pesos enteros.
      costo:          row[11] != null ? Math.round(Number(row[11])) : null,
      serial:         row[12] != null ? String(row[12]) : null,
      // La columna 13 (Garantia) del Excel se ignora: la garantía se deriva
      // de la fecha de venta (cubre 1 año).
      garantia:       computeGarantia(fecha),
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
  'tipoPago', 'tipoPlan', 'tipoPantalla', 'cuentaDedicada', 'debe',
];
const EQUIPO_INT_FIELDS = ['pantallas', 'itemQuantity'];
const EQUIPO_FLOAT_FIELDS = ['precioVenta', 'costo', 'saldoDebe'];
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

  // Coherencia del saldo pendiente: `debe` se normaliza a SI/NO y el monto
  // solo existe cuando la venta quedó debiendo — si no, se limpia.
  if (d.debe !== undefined) {
    d.debe = (d.debe || '').toUpperCase() === 'SI' ? 'SI' : 'NO';
    if (d.debe === 'NO') d.saldoDebe = null;
  }

  // Auto-calcular año, mes y garantía a partir de la fecha (YYYY-MM-DD)
  if (d.fecha !== undefined) d.garantia = computeGarantia(d.fecha);
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

router.get('/payments/ventas-equipos/debug-xlsx', asyncHandler(async (_req, res) => {
  const filepath = path.join(__dirname, '..', '..', '..', 'Tablas', 'order_inventario2026.xlsx');
  try {
    const wb = XLSX.readFile(filepath);
    const sheetName = wb.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
    res.json({ sheetNames: wb.SheetNames, firstSheetRows: data.slice(0, 3) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}));

router.get('/payments/ventas-equipos', asyncHandler(async (_req, res) => {
  const count = await VentaEquipo.count();
  if (count === 0) await importVentasEquipos();
  const rows = await VentaEquipo.findAll({ order: [['fecha', 'DESC']] });
  // La garantía se recalcula en cada lectura: una venta que cumple el año
  // debe pasar de SI a NO sin esperar a que alguien edite el registro.
  res.json(rows.map(r => {
    const j = r.toJSON();
    j.garantia = computeGarantia(j.fecha);
    return j;
  }));
}));

router.post('/payments/ventas-equipos', asyncHandler(async (req, res) => {
  const data = sanitizeVentaBody(req.body);
  if (!data.idVM) return res.status(400).json({ error: 'El ID de Venta (idVM) es obligatorio' });
  const venta = await VentaEquipo.create(data);

  // ── Responder INMEDIATAMENTE para no bloquear al cliente ──────────────────
  // Device.findOrCreate corre bajo WAL (SQLite) y necesita su propio write-lock.
  // Si lo await-amos en la misma cadena que VentaEquipo.create, el segundo lock
  // no puede adquirirse mientras el primero no libera → deadlock → UI congelada.
  // Solución: enviamos la respuesta primero y registramos el Device como efecto
  // secundario no-bloqueante usando setImmediate (corre tras soltar el event loop).
  res.status(201).json(venta);

  // Solo registrar Device si hay un identificador real (idPantalla o nickname).
  // Antes se creaba un UNKNOWN-<timestamp> inútil cuando ambos estaban vacíos.
  const macOId = data.idPantalla || data.nickname;
  if (data.customerId && macOId) {
    setImmediate(async () => {
      try {
        const client = await Client.findOne({ where: { customerId: data.customerId } });
        if (client) {
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
      } catch (e) {
        console.error('[POST ventas-equipos] Error registrando Device (no-bloqueante):', e.message);
      }
    });
  }
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
// Expuesta para scripts de migración/recarga (scratch_*.js)
module.exports.importVentasEquipos = importVentasEquipos;
