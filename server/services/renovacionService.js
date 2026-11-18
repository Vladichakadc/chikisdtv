// "Registrar renovación": en UNA transacción crea la venta en Pagos y
// actualiza el Planificador (inicio real, meses, fin real, sin deuda), y deja
// el cambio en el historial para poder deshacerlo (incluida la venta).
//
// Regla de fechas: si el plan aún está vigente, la renovación arranca donde
// termina el actual (no se pierden días); si ya venció, arranca el día del
// pago. El admin puede fijar otro inicio a mano.
const sequelize = require('../config/database');
const { Planificador, Venta, TablaCliente } = require('../models');
const { buscarUltimosPagos } = require('../utils/ultimosPagos');
const { sanitizeVentaBody, siguienteIdVenta } = require('./ventasService');
const { registrarCambio } = require('./historialPlanificador');
const { calcDias } = require('../utils/planificadorAlerta');
const { conCuentaPadre } = require('./cuentaPadreDatos');
const { todayStr } = require('../utils/dateUtils');

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function sumarMeses(fecha, meses) {
  const m = String(fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setMonth(d.getMonth() + Math.trunc(Number(meses)));
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

// Inicio por defecto del nuevo período
function inicioSugerido(finActual, fechaPago) {
  const dias = calcDias(finActual);
  return dias != null && dias > 0 ? String(finActual).slice(0, 10) : fechaPago;
}

// Valores del pago cuando el formulario no los envía: último pago de la
// pantalla, Tipo Cliente de la Tabla Clientes y las mismas reglas de "Nueva
// Venta" en Pagos (cuenta dedicada SI con 3 pantallas, NO con 1 o 2).
async function valoresPorDefecto(p, transaction) {
  const pagos = await buscarUltimosPagos([{ idPantalla: p.idPantalla, customerId: p.customerId, nickname: p.nickname }]);
  const u = pagos.get(p.idPantalla) || {};
  const ficha = p.customerId ? await TablaCliente.findByPk(p.customerId, { attributes: ['tipoCliente'], raw: true, transaction }) : null;
  const pantallas = Number(p.pantallas) || Number(u.pantallas) || 1;
  return {
    sku: u.sku || null,
    tipoFire: u.tipoFire || null,
    estado: 'Activo',
    cortesia: u.cortesia || 'NO',
    pantallas,
    itemQuantity: 1,
    tipoPantalla: ficha?.tipoCliente || u.tipoPantalla || null,
    cuentaDedicada: pantallas >= 3 ? 'SI' : 'NO',
  };
}

class ErrorRenovacion extends Error {
  constructor(mensaje, status = 400) { super(mensaje); this.status = status; }
}

async function registrarRenovacion(idPantalla, datos, usuarioEmail) {
  const fecha = String(datos.fecha || todayStr()).trim();
  const meses = Math.round(Number(datos.meses));
  const precio = Number(datos.precioVenta);
  const tipoPlan = String(datos.tipoPlan || '').trim();
  if (!FECHA.test(fecha)) throw new ErrorRenovacion('Fecha de pago no válida (AAAA-MM-DD).');
  if (!Number.isFinite(meses) || meses < 1 || meses > 36) throw new ErrorRenovacion('Los meses deben estar entre 1 y 36.');
  if (!Number.isFinite(precio) || precio < 0) throw new ErrorRenovacion('El precio no es válido.');
  if (!tipoPlan) throw new ErrorRenovacion('Elige el plan.');
  if (datos.inicioReal && !FECHA.test(String(datos.inicioReal))) throw new ErrorRenovacion('Inicio no válido (AAAA-MM-DD).');

  return sequelize.transaction(async (transaction) => {
    const pantalla = await Planificador.findByPk(idPantalla, { transaction });
    if (!pantalla) throw new ErrorRenovacion('Pantalla no encontrada', 404);
    const p = await conCuentaPadre(pantalla.toJSON()); // usuario IPTV desde Cuentas Padre
    const nickname = String(p.nickname || '').trim();
    if (!nickname || /libre/i.test(nickname)) throw new ErrorRenovacion('La pantalla no tiene titular: asígnala antes de renovar.');

    const inicioReal = String(datos.inicioReal || inicioSugerido(p.duracionReal, fecha)).slice(0, 10);
    const duracionReal = sumarMeses(inicioReal, meses);

    // Datos del pago: los que envía el formulario o, si faltan, los del último
    // pago de esta pantalla (SKU, equipo, cortesía…) y las reglas de Pagos.
    const def = await valoresPorDefecto(p, transaction);
    const elegir = (campo) => (datos[campo] !== undefined && datos[campo] !== null && String(datos[campo]).trim() !== '' ? datos[campo] : def[campo]);
    const idVM = await siguienteIdVenta(transaction);
    const venta = await Venta.create(sanitizeVentaBody({
      idVM,
      customerId: p.customerId, nombre: p.nombre, apellido: p.apellido,
      idPantalla: p.idPantalla, nickname, cuentaId: p.cuentaId, cuenta: p.cuenta,
      fecha, precioVenta: precio, medioPago: datos.medioPago || null,
      tipoPago: 'Renovacion', tipoPlan,
      sku: elegir('sku'), tipoFire: elegir('tipoFire'),
      estado: elegir('estado'), cortesia: elegir('cortesia'),
      pantallas: elegir('pantallas'), itemQuantity: elegir('itemQuantity'),
      tipoPantalla: elegir('tipoPantalla'), cuentaDedicada: elegir('cuentaDedicada'),
      mes: datos.mes || undefined, // mes facturado (si no, el de la fecha)
    }), { transaction });

    const cambios = {
      inicioReal, duracionPlan: meses, duracionReal,
      debe: false, montoDebe: null, montoDebeUSD: null,
    };
    await Planificador.update(cambios, { where: { idPantalla }, transaction });
    const despues = await Planificador.findByPk(idPantalla, { transaction });

    const cambio = await registrarCambio({
      accion: 'renovar', idPantalla, antes: p, despues, ventaId: venta.idVM, usuarioEmail, transaction,
    });

    return { venta: venta.toJSON(), pantalla: despues.toJSON(), cambioId: cambio?.id ?? null, inicioReal, duracionReal };
  });
}

module.exports = { registrarRenovacion, sumarMeses, inicioSugerido, valoresPorDefecto, ErrorRenovacion };
