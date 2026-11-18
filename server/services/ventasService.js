// Reglas compartidas de la tabla de ventas (módulo Pagos): saneo del
// formulario, normalización del tipo de pago y siguiente ID (VM####).
// Las usan "Nueva Venta" (routes/admin/ventasLicencia.js) y "Registrar
// renovación" del Planificador (services/renovacionService.js).
const { Venta } = require('../models');

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// "Cambio de Plan" (valor histórico del Excel) cuenta como renovación en el
// negocio: la BD se normalizó el 2026-07-02 y ni un reimport del .xlsx ni una
// venta creada por API deben reintroducirlo.
function normalizeTipoPago(v) {
  if (!v) return v;
  return /^cambio de plan$/i.test(String(v).trim()) ? 'Renovacion' : v;
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
        const monthIndex = parseInt(parts[1], 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) out.mes = MESES[monthIndex];
      }
    }
  }

  return out;
}


// Siguiente ID de venta (VM + mayor número existente + 1). Dentro de una
// transacción de SQLite la lectura y la creación quedan serializadas.
async function siguienteIdVenta(transaction) {
  const all = await Venta.findAll({ attributes: ['idVM'], raw: true, transaction });
  const nums = all.map(v => parseInt(String(v.idVM || '').replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
  return `VM${nums.length ? Math.max(...nums) + 1 : 1}`;
}

module.exports = { MESES, normalizeTipoPago, sanitizeVentaBody, siguienteIdVenta };
