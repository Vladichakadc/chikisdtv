// Historial y deshacer del Planificador.
//
// Cada cambio guarda el antes/después de la pantalla (SIN contraseña: el
// historial no debe ser otra copia de las credenciales). Deshacer revierte en
// el servidor solo los campos que cambiaron, y solo si nadie los volvió a
// tocar después (si no, responde conflicto en lugar de pisar trabajo ajeno).
const crypto = require('crypto');
const { Planificador, PlanificadorCambio, Venta, CuentaPadre, Baja } = require('../models');
const sequelize = require('../config/database');

// Campos de una pantalla que se versionan (la contraseña queda fuera a propósito)
// Los datos de la cuenta (usuario, crédito, fechas) viven en Cuentas Padre.
const CAMPOS = [
  'idPantalla', 'cuentaId',
  'nombre', 'apellido', 'customerId', 'nickname', 'pantallas', 'duracionPlan',
  'inicioReal', 'duracionReal', 'alertaReal', 'cortesia', 'porcentaje', 'tipoPlan',
  'debe', 'montoDebe', 'montoDebeUSD',
];

const ETIQUETAS = {
  idPantalla: 'Pantalla', cuentaId: 'Cuenta', cuenta: 'Usuario IPTV', credito: 'Crédito',
  inicio: 'Inicio cuenta', finalizacion: 'Fin cuenta', nombre: 'Nombre', apellido: 'Apellido',
  customerId: 'Customer ID', nickname: 'Nickname', pantallas: 'Pantallas', duracionPlan: 'Duración (meses)',
  inicioReal: 'Inicio real', duracionReal: 'Fin real', alertaReal: 'Alerta', cortesia: 'Cortesía',
  porcentaje: 'Porcentaje', tipoPlan: 'Tipo de plan', debe: 'Debe', montoDebe: 'Debe (COP)', montoDebeUSD: 'Debe (USD)',
};

const nuevoLote = () => crypto.randomUUID();

function foto(fila) {
  if (!fila) return null;
  const f = typeof fila.toJSON === 'function' ? fila.toJSON() : fila;
  const out = {};
  for (const c of CAMPOS) out[c] = f[c] === undefined ? null : f[c];
  // Normaliza booleanos (SQLite devuelve 0/1 en consultas raw)
  for (const b of ['debe', 'cortesia']) if (out[b] != null) out[b] = !!out[b];
  return out;
}

function igual(a, b) {
  const na = a === undefined || a === '' ? null : a;
  const nb = b === undefined || b === '' ? null : b;
  if (na === null || nb === null) return na === nb;
  if (typeof na === 'boolean' || typeof nb === 'boolean') return !!na === !!nb;
  if (!isNaN(Number(na)) && !isNaN(Number(nb)) && String(na).trim() !== '' && String(nb).trim() !== '') return Number(na) === Number(nb);
  return String(na).trim() === String(nb).trim();
}

function camposDistintos(antes, despues) {
  if (!antes || !despues) return CAMPOS.filter(c => (antes || despues)[c] != null);
  return CAMPOS.filter(c => !igual(antes[c], despues[c]));
}

async function registrarCambio({ accion, idPantalla, antes, despues, lote = null, ventaId = null, usuarioEmail = null, transaction }) {
  const a = foto(antes);
  const d = foto(despues);
  const campos = camposDistintos(a, d);
  if ((accion === 'editar' || accion === 'sincronizar') && campos.length === 0) return null; // no hubo cambio real
  return PlanificadorCambio.create({
    lote, accion, idPantalla, ventaId, usuarioEmail,
    campos: JSON.stringify(campos),
    antes: a ? JSON.stringify(a) : null,
    despues: d ? JSON.stringify(d) : null,
  }, { transaction });
}

const parse = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

function presentar(c) {
  const antes = parse(c.antes);
  const despues = parse(c.despues);
  const campos = parse(c.campos) || [];
  return {
    id: c.id, lote: c.lote, accion: c.accion, idPantalla: c.idPantalla, ventaId: c.ventaId,
    usuarioEmail: c.usuarioEmail, createdAt: c.createdAt, deshecho: !!c.deshecho,
    deshechoPor: c.deshechoPor, deshechoEn: c.deshechoEn, deshaceId: c.deshaceId,
    cliente: [(despues || antes)?.nombre, (despues || antes)?.apellido].filter(Boolean).join(' ') || (despues || antes)?.nickname || null,
    cambios: campos.map(k => ({ campo: k, etiqueta: ETIQUETAS[k] || k, antes: antes?.[k] ?? null, despues: despues?.[k] ?? null })),
  };
}

class ConflictoDeshacer extends Error {
  constructor(mensaje, detalles = []) { super(mensaje); this.name = 'ConflictoDeshacer'; this.detalles = detalles; }
}

// Revierte UN cambio dentro de la transacción dada. Devuelve un resumen.
async function revertir(cambio, usuarioEmail, transaction) {
  if (cambio.deshecho) throw new ConflictoDeshacer('Este cambio ya se deshizo.');
  if (cambio.accion === 'deshacer') throw new ConflictoDeshacer('Un "deshacer" no se puede deshacer desde aquí.');
  const antes = parse(cambio.antes);
  const despues = parse(cambio.despues);
  const campos = parse(cambio.campos) || [];
  const idActual = despues?.idPantalla || cambio.idPantalla;
  const actual = await Planificador.findByPk(idActual, { transaction });

  // Conflicto: algún campo cambiado se volvió a modificar después
  const verificar = (fila) => {
    const f = foto(fila);
    const distintos = campos.filter(k => !igual(f[k], despues[k]));
    if (distintos.length) {
      throw new ConflictoDeshacer(
        `La pantalla ${idActual} cambió después de este registro; no se deshace para no pisar ese cambio.`,
        distintos.map(k => ({ campo: ETIQUETAS[k] || k, esperado: despues[k], actual: f[k] })),
      );
    }
  };

  let resultado;
  if (cambio.accion === 'eliminar') {
    if (actual || await Planificador.findByPk(cambio.idPantalla, { transaction })) {
      throw new ConflictoDeshacer(`Ya existe otra pantalla ${cambio.idPantalla}; no se puede recrear.`);
    }
    // Los datos de cuenta (incluida la contraseña) salen de Cuentas Padre; solo si
    // la cuenta no existe allí se toman de una pantalla hermana (respaldo legado)
    const cp = await CuentaPadre.findByPk(antes.cuentaId, { transaction });
    const hermana = cp ? null : await Planificador.findOne({ where: { cuentaId: antes.cuentaId }, raw: true, transaction });
    const legado = hermana ? { cuenta: hermana.cuenta, password: hermana.password, credito: hermana.credito, inicio: hermana.inicio, finalizacion: hermana.finalizacion } : {};
    await Planificador.create({ ...antes, ...legado }, { transaction });
    resultado = { idPantalla: cambio.idPantalla, accion: 'recreada' };
  } else if (cambio.accion === 'crear') {
    if (!actual) throw new ConflictoDeshacer(`La pantalla ${idActual} ya no existe.`);
    verificar(actual);
    await Planificador.destroy({ where: { idPantalla: idActual }, transaction });
    resultado = { idPantalla: idActual, accion: 'eliminada' };
  } else {
    if (!actual) throw new ConflictoDeshacer(`La pantalla ${idActual} ya no existe.`);
    verificar(actual);
    const update = {};
    for (const k of campos) update[k] = antes[k];
    await Planificador.update(update, { where: { idPantalla: idActual }, transaction });
    resultado = { idPantalla: antes.idPantalla || idActual, accion: 'revertida', campos: campos.length };
    if (cambio.accion === 'renovar' && cambio.ventaId) {
      // La venta que creó la renovación también se elimina
      await Venta.destroy({ where: { idVM: cambio.ventaId }, transaction });
      resultado.ventaEliminada = cambio.ventaId;
    }
    if (cambio.accion === 'baja' && cambio.ventaId) {
      // La baja registrada en el módulo Bajas también se elimina
      await Baja.destroy({ where: { idBaja: cambio.ventaId }, transaction });
      resultado.bajaEliminada = cambio.ventaId;
    }
  }

  await cambio.update({ deshecho: true, deshechoPor: usuarioEmail, deshechoEn: new Date() }, { transaction });
  await PlanificadorCambio.create({
    accion: 'deshacer', idPantalla: cambio.idPantalla, deshaceId: cambio.id, usuarioEmail,
    lote: cambio.lote, campos: cambio.campos, antes: cambio.despues, despues: cambio.antes,
  }, { transaction });
  return resultado;
}

async function deshacerCambio(id, usuarioEmail) {
  return sequelize.transaction(async (transaction) => {
    const cambio = await PlanificadorCambio.findByPk(id, { transaction });
    if (!cambio) throw new ConflictoDeshacer('Cambio no encontrado.');
    return revertir(cambio, usuarioEmail, transaction);
  });
}

// Deshace todos los cambios de un lote (p. ej. una sincronización). Si alguno
// tiene conflicto no se aplica nada (todo o nada).
async function deshacerLote(lote, usuarioEmail) {
  return sequelize.transaction(async (transaction) => {
    const cambios = await PlanificadorCambio.findAll({ where: { lote, deshecho: false }, order: [['id', 'DESC']], transaction });
    const pendientes = cambios.filter(c => c.accion !== 'deshacer');
    if (!pendientes.length) throw new ConflictoDeshacer('No hay cambios pendientes de deshacer en esta operación.');
    const resultados = [];
    for (const c of pendientes) resultados.push(await revertir(c, usuarioEmail, transaction));
    return { deshechos: resultados.length, resultados };
  });
}

module.exports = { CAMPOS, nuevoLote, foto, registrarCambio, presentar, deshacerCambio, deshacerLote, ConflictoDeshacer };
