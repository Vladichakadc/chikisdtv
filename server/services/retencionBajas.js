// Plan de retención: clientes dados de baja a los que vale la pena ofrecerles
// volver, con su último plan y su teléfono para enviarles la oferta por
// WhatsApp. La oferta en sí (precios, descuento y mensaje) se arma en el
// cliente (client/src/pages/admin/bajas/ofertaRetencion.js) con el catálogo
// de planes activo que también devuelve este servicio.
//
// Quedan por fuera:
//   · los que ya volvieron a comprar (recuperados);
//   · movimientos internos ("Cambio de cuenta o de pantalla");
//   · "Fallecimiento del titular" (no se le escribe a esa familia una oferta);
//   · los que hoy siguen activos con otra pantalla en el Planificador.
const { Op } = require('sequelize');
const { Baja, Venta, Planificador, Plan, Client, TablaCliente } = require('../models');
const { filasDeBajas } = require('./analisisBajas');

const EXCLUIDAS = new Set(['cambio_cuenta', 'fallecimiento']);
const hoyISO = () => new Date().toLocaleDateString('en-CA');
const diasEntre = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);

function calcularCandidatos(filas, { activos = new Set(), hoy = hoyISO() } = {}) {
  // Si un cliente tiene varias bajas, se toma la más reciente
  const porCliente = new Map();
  for (const f of filas) {
    if (f.recuperado || EXCLUIDAS.has(f.categoria)) continue;
    if (f.customerId && activos.has(f.customerId)) continue;
    const clave = f.customerId || `nick:${String(f.nickname || f.idBaja).toLowerCase()}`;
    const previa = porCliente.get(clave);
    if (!previa || f.fechaBaja > previa.fechaBaja) porCliente.set(clave, f);
  }
  return [...porCliente.values()]
    .map(f => ({
      id: f.id, idBaja: f.idBaja, nickname: f.nickname, nombre: f.nombre, customerId: f.customerId,
      fechaBaja: f.fechaBaja, diasDesdeBaja: Math.max(0, diasEntre(f.fechaBaja, hoy)),
      categoria: f.categoria, categoriaNombre: f.categoriaNombre, observaciones: f.observaciones,
      pantallas: f.pantallas, tipoPlan: f.tipoPlan, vidaMeses: f.vidaMeses, ingresoMensual: f.ingresoMensual,
      ultimaVenta: f.ultimaVenta,
    }))
    .sort((a, b) => b.fechaBaja.localeCompare(a.fechaBaja));
}

async function retencionBajas({ hoy } = {}) {
  const [bajas, ventas, activosRows, planes] = await Promise.all([
    Baja.findAll({ raw: true }),
    Venta.findAll({ attributes: ['customerId', 'fecha', 'tipoPago', 'tipoPlan', 'precioVenta'], raw: true }),
    Planificador.findAll({
      where: { customerId: { [Op.ne]: null }, nickname: { [Op.notLike]: '%libre%' } },
      attributes: ['customerId'], raw: true,
    }),
    Plan.findAll({ where: { activo: true }, attributes: ['id', 'nombre', 'precio', 'numeroPantallas', 'duracionDias'], raw: true }),
  ]);
  const activos = new Set(activosRows.map(r => String(r.customerId).trim()).filter(Boolean));
  const candidatos = calcularCandidatos(filasDeBajas(bajas, ventas), { activos, hoy });

  // Teléfono: ficha del cliente (Client.phone) o móvil de Tabla Clientes
  const ids = [...new Set(candidatos.map(c => c.customerId).filter(Boolean))];
  const [clientes, fichas] = ids.length
    ? await Promise.all([
        Client.findAll({ where: { customerId: ids }, attributes: ['customerId', 'phone'], raw: true }),
        TablaCliente.findAll({ where: { customerId: ids }, attributes: ['customerId', 'movil', 'pais'], raw: true }),
      ])
    : [[], []];
  const tel = new Map(clientes.map(c => [String(c.customerId), (c.phone || '').trim()]));
  const fic = new Map(fichas.map(f => [String(f.customerId), f]));
  for (const c of candidatos) {
    const f = c.customerId ? fic.get(c.customerId) : null;
    c.telefono = (c.customerId && tel.get(c.customerId)) || (f?.movil || '').trim() || null;
    c.pais = (f?.pais || '').trim() || null;
  }
  return { hoy: hoy || hoyISO(), candidatos, planes };
}

module.exports = { retencionBajas, calcularCandidatos };
