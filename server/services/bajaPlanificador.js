// "Dar de baja" desde el Planificador: en UNA transacción registra la baja en
// el módulo Bajas (con todos sus campos) y deja la pantalla "Libre", lista para
// asignar a otro cliente. Queda en el historial: "Deshacer" devuelve los datos
// del cliente a la pantalla y elimina la baja creada.
const sequelize = require('../config/database');
const { Planificador, Baja, Venta } = require('../models');
const { buscarUltimosPagos } = require('../utils/ultimosPagos');
const { registrarCambio } = require('./historialPlanificador');
const { todayStr } = require('../utils/dateUtils');
const { MOTIVOS_BAJA } = require('../utils/motivosBaja');

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const PLAN_POR_DURACION = { 1: 'Plan Mensual', 7: 'Plan Semestral', 14: 'Plan Anual' };

// Campos del cliente que se limpian: la pantalla queda "Libre". Los datos de la
// cuenta (usuario, contraseña, fechas de la cuenta padre) no se tocan.
const PANTALLA_LIBRE = {
  nombre: null, apellido: null, customerId: null, nickname: 'Libre',
  duracionPlan: null, inicioReal: null, duracionReal: null, alertaReal: null, porcentaje: null,
  tipoPlan: null, cortesia: false, debe: false, montoDebe: null, montoDebeUSD: null,
};

class ErrorBaja extends Error {
  constructor(mensaje, status = 400) { super(mensaje); this.status = status; }
}

const esLibre = (p) => {
  const nick = String(p?.nickname || '').trim().toLowerCase();
  return nick.includes('libre') || (!nick && !p?.nombre && !p?.customerId);
};

async function siguienteIdBaja(transaction) {
  const filas = await Baja.findAll({ attributes: ['idBaja'], raw: true, transaction });
  let max = 0;
  for (const b of filas) {
    const n = parseInt(String(b.idBaja || '').replace(/\D/g, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return `BAJA${String(max + 1).padStart(2, '0')}`;
}

// Valores sugeridos para el formulario de baja
async function prepararBaja(idPantalla) {
  const p = await Planificador.findByPk(idPantalla, { raw: true });
  if (!p) throw new ErrorBaja('Pantalla no encontrada', 404);
  if (esLibre(p)) throw new ErrorBaja('Esta pantalla ya está libre: no hay cliente para dar de baja.');
  const pagos = await buscarUltimosPagos([{ idPantalla: p.idPantalla, customerId: p.customerId, nickname: p.nickname }]);
  const u = pagos.get(p.idPantalla) || {};
  const activacion = p.customerId
    ? await Venta.findOne({ where: { customerId: p.customerId, tipoPago: 'Activacion Pantalla' }, order: [['fecha', 'ASC']], attributes: ['fecha'], raw: true })
    : null;
  const pantallas = Number(p.pantallas) || 1;
  const hoy = todayStr();
  return {
    pantalla: {
      idPantalla: p.idPantalla, cuentaId: p.cuentaId, nickname: p.nickname,
      nombre: [p.nombre, p.apellido].filter(Boolean).join(' ').trim() || null,
      customerId: p.customerId, vence: p.duracionReal || null, activacion: activacion?.fecha || null,
    },
    sugerido: {
      idBaja: await siguienteIdBaja(),
      fechaBaja: hoy,
      customerId: p.customerId || '',
      nombre: p.nombre || '', apellido: p.apellido || '', nickname: p.nickname || '',
      pantallas,
      tipoPlan: p.tipoPlan || PLAN_POR_DURACION[Math.floor(Number(p.duracionPlan))] || u.tipoPlan || '',
      tipoPantalla: u.tipoPantalla || (pantallas === 1 ? 'Individual' : pantallas <= 3 ? 'Familiar' : 'Revendedor'),
      sku: u.sku || '', tipoFire: u.tipoFire || '',
      cuentaDedicada: u.cuentaDedicada || (pantallas >= 3 ? 'SI' : 'NO'),
      cortesia: p.cortesia ? 'SI' : (u.cortesia || 'NO'),
      devolucion: 'NO',
      fecha: p.inicioReal || null, // inicio del último ciclo (misma semántica del módulo Bajas)
      motivo: '', observaciones: '',
    },
  };
}

const texto = (v) => (v == null ? null : String(v).trim() || null);

async function registrarBaja(idPantalla, datos = {}, usuarioEmail = null) {
  const motivo = texto(datos.motivo);
  if (!motivo) throw new ErrorBaja('Elige el motivo de la baja: sin él no se puede analizar por qué se van los clientes.');
  if (motivo === 'Otro motivo' && !texto(datos.observaciones)) throw new ErrorBaja('Con "Otro motivo", escribe en las observaciones cuál fue.');
  const fechaBaja = String(datos.fechaBaja || todayStr()).trim();
  if (!FECHA.test(fechaBaja)) throw new ErrorBaja('La fecha de baja no es válida (AAAA-MM-DD).');
  const devolucion = String(datos.devolucion || 'NO').toUpperCase() === 'SI' ? 'SI' : 'NO';

  return sequelize.transaction(async (transaction) => {
    const antes = await Planificador.findByPk(idPantalla, { transaction });
    if (!antes) throw new ErrorBaja('Pantalla no encontrada', 404);
    if (esLibre(antes)) throw new ErrorBaja('Esta pantalla ya está libre.');
    const fotoAntes = antes.toJSON();

    const [y, m] = fechaBaja.split('-').map(Number);
    const idBaja = await siguienteIdBaja(transaction);
    const pantallas = Math.max(1, Number(datos.pantallas) || Number(fotoAntes.pantallas) || 1);
    const baja = await Baja.create({
      idBaja,
      customerId: texto(datos.customerId) ?? fotoAntes.customerId,
      nombre: texto(datos.nombre) ?? fotoAntes.nombre,
      apellido: texto(datos.apellido) ?? fotoAntes.apellido,
      nickname: texto(datos.nickname) ?? fotoAntes.nickname,
      sku: texto(datos.sku), tipoFire: texto(datos.tipoFire),
      devolucion,
      estado: 'Desactivado',
      cortesia: String(datos.cortesia || (fotoAntes.cortesia ? 'SI' : 'NO')).toUpperCase() === 'SI' ? 'SI' : 'NO',
      pantallas,
      fechaBaja,
      fecha: FECHA.test(String(datos.fecha || '')) ? datos.fecha : (fotoAntes.inicioReal || null),
      anio: y, mes: MESES[m - 1],
      itemQuantity: 1,
      tipoPlan: texto(datos.tipoPlan) ?? fotoAntes.tipoPlan,
      tipoPantalla: texto(datos.tipoPantalla),
      cuentaDedicada: String(datos.cuentaDedicada || '').toUpperCase() === 'SI' ? 'SI' : 'NO',
      motivo,
      observaciones: texto(datos.observaciones),
    }, { transaction });

    await antes.update(PANTALLA_LIBRE, { transaction });
    const cambio = await registrarCambio({
      accion: 'baja', idPantalla, antes: fotoAntes, despues: antes, ventaId: idBaja, usuarioEmail, transaction,
    });
    return { baja: baja.toJSON(), pantalla: antes.toJSON(), cambioId: cambio?.id ?? null };
  });
}

module.exports = { prepararBaja, registrarBaja, siguienteIdBaja, ErrorBaja, PANTALLA_LIBRE, MOTIVOS_BAJA };
