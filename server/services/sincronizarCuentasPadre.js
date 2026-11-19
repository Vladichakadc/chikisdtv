// "Sincronizar CP": trae al Planificador los datos actualizados del módulo
// Cuentas Padre (usuario IPTV, crédito, fechas de inicio/fin y contraseña).
//
// Cuentas Padre sigue siendo la única fuente: la vista del Planificador ya los
// lee en vivo (cuentaPadreDatos.conCuentaPadre). La sincronización:
//   1. crea pantallas libres para cuentas padre nuevas que aún no tienen filas;
//   2. refresca la copia de referencia del Planificador (cuenta, crédito,
//      inicio, finalización) para que el informe muestre qué cambió desde la
//      última sincronización;
//   3. informa por cuenta el estado de la contraseña SIN copiarla: las
//      contraseñas siguen cifradas solo en Cuentas Padre.
const { Planificador, PlanificadorCambio } = require('../models');
const { registrarCambio, nuevoLote } = require('./historialPlanificador');
const { mapaCuentas } = require('./cuentaPadreDatos');
const { ensurePantallasCuentasPadre } = require('./planificadorImportService');
const { calcDias } = require('../utils/planificadorAlerta');

// Campo del Planificador → campo de CuentaPadre (sin contraseña)
const CAMPOS_SYNC = { cuenta: 'nombreUsuario', credito: 'credito', inicio: 'fechaInicio', finalizacion: 'fechaFin' };

function distinto(nuevo, viejo, numerico) {
  const a = nuevo === '' || nuevo === undefined ? null : nuevo;
  const b = viejo === '' || viejo === undefined ? null : viejo;
  if (a === null && b === null) return false;
  if (a === null || b === null) return true;
  return numerico ? Number(a) !== Number(b) : String(a).trim() !== String(b).trim();
}

function valoresDe(cp) {
  const out = {};
  for (const [campo, campoCp] of Object.entries(CAMPOS_SYNC)) out[campo] = cp[campoCp] ?? null;
  return out;
}

// Una fila representativa por cuenta (todas sus pantallas comparten estos datos)
async function referenciaPorCuenta() {
  const filas = await Planificador.findAll({ attributes: ['cuentaId', ...Object.keys(CAMPOS_SYNC)], raw: true });
  const ref = new Map();
  const conteo = new Map();
  for (const f of filas) {
    const id = String(f.cuentaId || '').trim();
    if (!ref.has(id)) ref.set(id, f);
    conteo.set(id, (conteo.get(id) || 0) + 1);
  }
  return { ref, conteo };
}

function cambiosDe(cp, antes) {
  const nuevos = valoresDe(cp);
  return Object.keys(CAMPOS_SYNC)
    .filter(campo => distinto(nuevos[campo], antes?.[campo], campo === 'credito'))
    .map(campo => ({ campo, antes: antes?.[campo] ?? null, despues: nuevos[campo] }));
}

// ¿Hay algo que sincronizar? (cuentas sin pantallas o datos que cambiaron)
async function syncPendiente(cuentas) {
  const mapa = cuentas || await mapaCuentas();
  const { ref } = await referenciaPorCuenta();
  for (const [cuentaId, cp] of mapa) {
    if (!ref.has(cuentaId)) return true;
    if (cambiosDe(cp, ref.get(cuentaId)).length) return true;
  }
  return false;
}

async function sincronizarCuentasPadre({ usuarioEmail } = {}) {
  const cuentas = await mapaCuentas();
  if (cuentas.size === 0) return null;

  // 1. Pantallas libres para cuentas padre nuevas (quedan en el historial como
  //    un lote: "Deshacer sincronización" las elimina)
  const creadas = new Set(await ensurePantallasCuentasPadre());
  const lote = nuevoLote();
  if (creadas.size) {
    const nuevas = await Planificador.findAll({ where: { cuentaId: [...creadas] }, raw: true });
    for (const f of nuevas) {
      await registrarCambio({ accion: 'crear', idPantalla: f.idPantalla, antes: null, despues: f, lote, usuarioEmail });
    }
  }

  // 2. Informe + copia de referencia
  const { ref, conteo } = await referenciaPorCuenta();
  const diff = [];
  let pantallasActualizadas = 0;
  for (const [cuentaId, cp] of cuentas) {
    const pantallas = conteo.get(cuentaId) || 0;
    const base = {
      cuentaId,
      cuenta: cp.nombreUsuario || null,
      estado: cp.estado || null,
      diasAlFin: calcDias(cp.fechaFin),
      tienePassword: !!cp.contrasena,
      pantallasAfectadas: pantallas,
    };
    if (!pantallas) { diff.push({ ...base, status: 'sin_pantallas', cambios: [] }); continue; }
    const cambios = creadas.has(cuentaId) ? [] : cambiosDe(cp, ref.get(cuentaId));
    if (cambios.length || creadas.has(cuentaId)) {
      const [n] = await Planificador.update(valoresDe(cp), { where: { cuentaId } });
      pantallasActualizadas += n;
    }
    diff.push({
      ...base,
      status: creadas.has(cuentaId) ? 'creada' : cambios.length ? 'actualizada' : 'sin_cambio',
      cambios,
    });
  }

  const conCambios   = diff.filter(d => d.status === 'actualizada').length;
  const sinCambio    = diff.filter(d => d.status === 'sin_cambio').length;
  const sinPantallas = diff.filter(d => d.status === 'sin_pantallas').length;
  const sinPassword  = diff.filter(d => !d.tienePassword).length;

  const partes = [`${cuentas.size} cuenta(s) revisada(s)`];
  if (creadas.size) partes.push(`${creadas.size} nueva(s) agregada(s)`);
  if (conCambios) partes.push(`${conCambios} con cambios (${pantallasActualizadas} pantalla(s))`);
  if (sinCambio) partes.push(`${sinCambio} sin cambio`);
  if (sinPantallas) partes.push(`${sinPantallas} sin pantallas`);
  if (sinPassword) partes.push(`${sinPassword} sin contraseña en Cuentas Padre`);

  const huboCambios = creadas.size ? await PlanificadorCambio.count({ where: { lote } }) : 0;
  return {
    message: partes.join(' · '),
    conCambios, sinCambio, sinPantallas, creadas: creadas.size, pantallasActualizadas,
    diff,
    lote: huboCambios ? lote : null,
  };
}

module.exports = { sincronizarCuentasPadre, syncPendiente, CAMPOS_SYNC };
