// Estado del servicio de cada cliente de la Tabla de Clientes, para el módulo
// Clientes: pantallas en el Planificador, próximo vencimiento, pagos y bajas.
//
// Estado (por la pantalla que vence primero):
//   · activo        → tiene pantallas y la próxima vence en más de 7 días
//                     (o es cortesía sin fecha);
//   · por_vencer    → alguna vence en los próximos 7 días;
//   · vencido       → alguna ya venció;
//   · sin_servicio  → no tiene pantallas asignadas (se marca si tiene bajas).
// Pagos: ventas reales (sin cortesías ni cambios de plan), como en Pagos.
const { Planificador, Venta, Baja } = require('../models');

const hoyISO = () => new Date().toLocaleDateString('en-CA');
const dias = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
const id = (v) => String(v ?? '').trim();
const esLibre = (n) => !String(n || '').trim() || /^libre$/i.test(String(n).trim());
const esIngresoReal = (v) => v.tipoPago !== 'Cortesia' && v.tipoPago !== 'Cambio de Plan';
const AVISO = 7;

function calcularServicioClientes({ pantallas = [], ventas = [], bajas = [] }, { hoy = hoyISO() } = {}) {
  const out = new Map();
  const de = (c) => {
    if (!out.has(c)) out.set(c, { pantallas: 0, proximoVence: null, diasVence: null, cortesias: 0, ultimoPago: null, totalPagado: 0, pagos: 0, recaudo12m: 0, bajas: 0, ultimaBaja: null });
    return out.get(c);
  };
  const hace12 = (() => { const d = new Date(`${hoy}T12:00:00`); d.setFullYear(d.getFullYear() - 1); return d.toLocaleDateString('en-CA'); })();

  for (const p of pantallas) {
    const c = id(p.customerId);
    if (!c || esLibre(p.nickname)) continue;
    const s = de(c);
    s.pantallas += 1;
    if (p.cortesia) s.cortesias += 1;
    const vence = p.duracionReal ? String(p.duracionReal).slice(0, 10) : null;
    if (vence && (!s.proximoVence || vence < s.proximoVence)) s.proximoVence = vence;
  }
  for (const v of ventas) {
    const c = id(v.customerId);
    if (!c || !esIngresoReal(v)) continue;
    const s = de(c);
    const f = v.fecha ? String(v.fecha).slice(0, 10) : null;
    const monto = Number(v.precioVenta) || 0;
    s.pagos += 1;
    s.totalPagado += monto;
    if (f && f > hace12 && f <= hoy) s.recaudo12m += monto;
    if (f && f <= hoy && (!s.ultimoPago || f > s.ultimoPago)) s.ultimoPago = f;
  }
  for (const b of bajas) {
    const c = id(b.customerId);
    if (!c) continue;
    const s = de(c);
    s.bajas += 1;
    const f = b.fechaBaja ? String(b.fechaBaja).slice(0, 10) : null;
    if (f && (!s.ultimaBaja || f > s.ultimaBaja)) s.ultimaBaja = f;
  }
  for (const s of out.values()) {
    s.totalPagado = Math.round(s.totalPagado);
    s.recaudo12m = Math.round(s.recaudo12m);
    s.diasVence = s.proximoVence ? dias(hoy, s.proximoVence) : null;
    s.diasSinPagar = s.ultimoPago ? dias(s.ultimoPago, hoy) : null;
    if (!s.pantallas) s.estado = 'sin_servicio';
    else if (s.diasVence == null) s.estado = 'activo';
    else if (s.diasVence < 0) s.estado = 'vencido';
    else if (s.diasVence <= AVISO) s.estado = 'por_vencer';
    else s.estado = 'activo';
  }
  return Object.fromEntries(out);
}

async function servicioClientes() {
  const [pantallas, ventas, bajas] = await Promise.all([
    Planificador.findAll({ attributes: ['customerId', 'nickname', 'duracionReal', 'cortesia'], raw: true }),
    Venta.findAll({ attributes: ['customerId', 'fecha', 'precioVenta', 'tipoPago'], raw: true }),
    Baja.findAll({ attributes: ['customerId', 'fechaBaja'], raw: true }),
  ]);
  const hoy = hoyISO();
  return { hoy, clientes: calcularServicioClientes({ pantallas, ventas, bajas }, { hoy }) };
}

module.exports = { servicioClientes, calcularServicioClientes };
