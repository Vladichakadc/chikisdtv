// Último pago (tabla de ventas / módulo Pagos) de una o varias pantallas del
// Planificador, en UNA sola consulta.
//
// Vínculo principal: idPantalla + customerId. El idPantalla solo no basta
// porque los slots se reasignan a otros clientes (la venta vieja de M032-3
// pertenece al titular anterior); el customerId lo ata al cliente actual.
// Respaldo: nickname exacto — cubre ventas históricas sin idPantalla o
// registradas en otro slot. Entre todas las coincidencias gana la más
// reciente, así renombrar un nickname ya no "pierde" el último pago.
// Una venta ya atada por idPantalla a otra pantalla del lote no se reutiliza.
const { Op } = require('sequelize');
const { Venta } = require('../models');

const ATRIBUTOS = ['idVM', 'idPantalla', 'nickname', 'customerId', 'tipoPlan', 'tipoPago', 'precioVenta', 'fecha', 'pantallas', 'createdAt'];

const limpio = (v) => (v == null ? '' : String(v).trim());

function esMasReciente(a, b) {
  if (!b) return true;
  const fa = limpio(a.fecha), fb = limpio(b.fecha);
  if (fa !== fb) return fa > fb;
  return new Date(a.createdAt || 0) > new Date(b.createdAt || 0);
}

/**
 * @param {Array<{idPantalla?: string, customerId?: string, nickname?: string}>} pantallas
 * @returns {Promise<Map<string, object|null>>} clave = idPantalla (o `nick:<nickname>` si no hay idPantalla)
 */
async function buscarUltimosPagos(pantallas) {
  const claves = pantallas.map(p => limpio(p.idPantalla) || `nick:${limpio(p.nickname)}`);
  const resultado = new Map(claves.map(k => [k, null]));

  const condiciones = [];
  const nicknames = new Set();
  for (const p of pantallas) {
    const id = limpio(p.idPantalla), cid = limpio(p.customerId), nick = limpio(p.nickname);
    if (id && cid) condiciones.push({ idPantalla: id, customerId: cid });
    if (nick) nicknames.add(nick);
  }
  if (nicknames.size) condiciones.push({ nickname: { [Op.in]: [...nicknames] } });
  if (!condiciones.length) return resultado;

  const ventas = await Venta.findAll({ where: { [Op.or]: condiciones }, attributes: ATRIBUTOS, raw: true });

  // Una venta atada por idPantalla+customerId a una pantalla NO se reutiliza
  // por nickname para otra pantalla del mismo lote: evita contar dos veces el
  // mismo pago en el comprobante consolidado (p. ej. un cliente que pasó de
  // M001-3 a M001-2 conservando el nickname).
  const reclamadaPor = new Map();
  for (const p of pantallas) {
    const id = limpio(p.idPantalla), cid = limpio(p.customerId);
    if (!id || !cid) continue;
    for (const v of ventas) {
      if (limpio(v.idPantalla) === id && limpio(v.customerId) === cid) reclamadaPor.set(v.idVM, id);
    }
  }

  pantallas.forEach((p, i) => {
    const id = limpio(p.idPantalla), cid = limpio(p.customerId), nick = limpio(p.nickname);
    let mejor = null;
    for (const v of ventas) {
      const porPantalla = id && cid && limpio(v.idPantalla) === id && limpio(v.customerId) === cid;
      const dueno = reclamadaPor.get(v.idVM);
      const porNickname = nick && limpio(v.nickname) === nick && (!dueno || dueno === id);
      if (!porPantalla && !porNickname) continue;
      if (esMasReciente(v, mejor)) mejor = { ...v, vinculo: porPantalla ? 'pantalla' : 'nickname' };
    }
    resultado.set(claves[i], mejor);
  });
  return resultado;
}

module.exports = { buscarUltimosPagos };
