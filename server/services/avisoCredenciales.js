// Datos para el "Aviso de cambio de credenciales" de una cuenta padre.
//
// Agrupa las pantallas ocupadas de la cuenta por cliente (customerId): un
// cliente con varios nicknames en la misma cuenta recibe UN mensaje que los
// nombra a todos. También informa sus nicknames en OTRAS cuentas padre, para
// que el mensaje le aclare que esas no cambiaron.
const { Op } = require('sequelize');
const { CuentaPadre, Planificador, Client, TablaCliente } = require('../models');

const esLibre = (f) => {
  const nick = String(f.nickname || '').trim();
  return !(nick || String(f.nombre || '').trim()) || nick.toLowerCase().includes('libre');
};
const unicos = (lista) => [...new Set(lista.filter(Boolean))];

async function datosAvisoCredenciales(cuentaId) {
  const cp = await CuentaPadre.findByPk(cuentaId);
  if (!cp) return null;

  const ATR = ['idPantalla', 'cuentaId', 'nombre', 'apellido', 'customerId', 'nickname', 'duracionReal'];
  const filas = (await Planificador.findAll({ where: { cuentaId: cp.cuentaId }, attributes: ATR, order: [['idPantalla', 'ASC']], raw: true }))
    .filter(f => !esLibre(f));

  const ids = unicos(filas.map(f => String(f.customerId || '').trim()));
  const [clientes, fichas, otras] = ids.length ? await Promise.all([
    Client.findAll({ where: { customerId: ids }, attributes: ['customerId', 'phone'], raw: true }),
    TablaCliente.findAll({ where: { customerId: ids }, attributes: ['customerId', 'movil', 'pais'], raw: true }),
    Planificador.findAll({ where: { customerId: ids, cuentaId: { [Op.ne]: cp.cuentaId } }, attributes: ATR, order: [['idPantalla', 'ASC']], raw: true }),
  ]) : [[], [], []];
  const tel = new Map(clientes.map(c => [String(c.customerId), (c.phone || '').trim()]));
  const ficha = new Map(fichas.map(f => [String(f.customerId), f]));

  // Un grupo por cliente; sin customerId, cada pantalla va sola
  const grupos = new Map();
  for (const f of filas) {
    const id = String(f.customerId || '').trim();
    const clave = id ? `c:${id}` : `p:${f.idPantalla}`;
    if (!grupos.has(clave)) {
      const fi = ficha.get(id);
      grupos.set(clave, {
        clave,
        customerId: id || null,
        nombre: [f.nombre, f.apellido].filter(Boolean).join(' ').trim() || null,
        telefono: (id && tel.get(id)) || (fi?.movil || '').trim() || null,
        pais: (fi?.pais || '').trim() || null,
        pantallas: [],
        otrasCuentas: id ? unicos(otras.filter(o => String(o.customerId).trim() === id && !esLibre(o)).map(o => o.nickname || o.idPantalla)) : [],
      });
    }
    grupos.get(clave).pantallas.push({ idPantalla: f.idPantalla, nickname: f.nickname || f.idPantalla, vence: f.duracionReal || null });
  }

  const lista = [...grupos.values()];
  return {
    cuentaId: cp.cuentaId,
    usuario: cp.nombreUsuario || null,
    contrasena: cp.contrasena || null,
    fechaFin: cp.fechaFin || null,
    clientes: lista,
    idPantallas: filas.map(f => f.idPantalla),
  };
}

module.exports = { datosAvisoCredenciales };
