// Cuentas Padre como ÚNICA fuente de los datos de cuenta de cada pantalla
// (usuario IPTV, contraseña, crédito, inicio y fin de la cuenta).
//
// Antes cada pantalla del Planificador guardaba una copia de esos datos y había
// que "Sincronizar CP" para que no se desfasaran. Ahora las columnas del
// Planificador (cuenta, password, credito, inicio, finalizacion) quedan como
// respaldo legado: se leen de CuentaPadre y se escriben en CuentaPadre.
const sequelize = require('../config/database');
const { CuentaPadre } = require('../models');
const { cifrar, descifrar } = require('../utils/cifrado');

// Campo del Planificador → campo de CuentaPadre
const MAPA = {
  cuenta: 'nombreUsuario',
  password: 'contrasena',
  credito: 'credito',
  inicio: 'fechaInicio',
  finalizacion: 'fechaFin',
};
const CAMPOS_CUENTA = Object.keys(MAPA);

async function mapaCuentas(cuentaIds) {
  const where = cuentaIds ? { cuentaId: [...new Set(cuentaIds.map(c => String(c || '').trim()).filter(Boolean))] } : undefined;
  const cps = await CuentaPadre.findAll(where ? { where } : {});
  // Instancias del modelo: el getter descifra la contraseña
  return new Map(cps.map(cp => [String(cp.cuentaId).trim(), cp.get({ plain: true })]));
}

// Sobrepone los datos de su cuenta padre a cada pantalla. Si la cuenta no existe
// en Cuentas Padre se conserva lo que traiga la fila (respaldo legado).
async function conCuentaPadre(filas, { cuentas } = {}) {
  const lista = Array.isArray(filas) ? filas : [filas];
  const mapa = cuentas || await mapaCuentas(lista.map(f => f?.cuentaId));
  const out = lista.map((f) => {
    if (!f) return f;
    const cp = mapa.get(String(f.cuentaId || '').trim());
    if (!cp) return 'password' in f ? { ...f, password: descifrar(f.password) } : { ...f };
    const r = { ...f };
    for (const [campo, campoCp] of Object.entries(MAPA)) r[campo] = cp[campoCp] ?? null;
    return r;
  });
  return Array.isArray(filas) ? out : out[0];
}

// Extrae del body de un PUT del Planificador los datos de cuenta y los
// escribe en su CuentaPadre (afectan a TODAS las pantallas de esa cuenta).
// Devuelve los campos que cambió.
async function guardarDatosCuenta(cuentaId, body, transaction) {
  const update = {};
  for (const [campo, campoCp] of Object.entries(MAPA)) {
    if (body[campo] === undefined) continue;
    const v = body[campo];
    if (campo === 'credito') update[campoCp] = v === '' || v == null ? null : Number(v);
    else update[campoCp] = v == null ? null : (String(v).trim() || null);
  }
  if (!Object.keys(update).length) return [];
  const cp = await CuentaPadre.findByPk(cuentaId, { transaction });
  if (!cp) return [];
  const antes = cp.get({ plain: true });
  const cambiados = Object.keys(update).filter(k => String(antes[k] ?? '') !== String(update[k] ?? ''));
  if (cambiados.length) await cp.update(update, { transaction });
  // La contraseña también se actualiza (cifrada) en todas las pantallas de la cuenta
  if (cambiados.includes('contrasena')) {
    await sequelize.query('UPDATE planificador SET password = ? WHERE cuentaId = ?', {
      replacements: [update.contrasena ? cifrar(update.contrasena) : null, cuentaId], transaction,
    });
  }
  return cambiados;
}

module.exports = { MAPA, CAMPOS_CUENTA, mapaCuentas, conCuentaPadre, guardarDatosCuenta };
