const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const { Planificador, CuentaPadre, Venta, Client, Plan, Recordatorio, AccesoCredencial, TablaCliente, PlanificadorCambio } = require('../../models');
const { registrarCambio, presentar, deshacerCambio, deshacerLote, ConflictoDeshacer } = require('../../services/historialPlanificador');
const { registrarRenovacion, inicioSugerido, ErrorRenovacion } = require('../../services/renovacionService');
const { conCuentaPadre, guardarDatosCuenta, mapaCuentas } = require('../../services/cuentaPadreDatos');
const { buscarUltimosPagos } = require('../../utils/ultimosPagos');
const asyncHandler = require('../../middleware/asyncHandler');
const { importFromExcel, autoFixCuentaIdMismatches } = require('../../services/planificadorImportService');
const { autoImportarSiDisponible } = require('../../utils/excelOrigen');
// Reglas únicas de estado (ver utils/planificadorAlerta.js): la alerta se
// recalcula según la fecha vigente y la cortesía es la columna `cortesia`.
const { DIAS_ALERTA, calcDias: calcDiasDB, alertaFromDias, estadoFromDias, varianteDe, esCortesia } = require('../../utils/planificadorAlerta');

const DIAS_ALERTA_CP = 30;

function calcCPVariante(dias) {
  if (dias == null) return 'sin_fecha';
  if (dias <= 0) return 'vencida';
  if (dias <= DIAS_ALERTA_CP) return 'alerta';
  return 'vigente';
}

// Detecta pantallas cuyo cuentaId no coincide con el prefijo de su idPantalla
// DESPUÉS de que autoFixCuentaIdMismatches() ya corrió: lo que queda son filas
// sin CuentaPadre coincidente — requieren revisión manual.
function findCuentaIdMismatches(pantallas) {
  return pantallas
    .filter(p => {
      const prefix = (p.idPantalla || '').split('-')[0];
      return prefix && p.cuentaId && prefix !== p.cuentaId;
    })
    .map(p => ({
      idPantalla: p.idPantalla,
      cuentaId: p.cuentaId,
      cuentaIdEsperado: p.idPantalla.split('-')[0],
    }));
}

// Las contraseñas de cuentas padre NO viajan en las cargas del Planificador:
// el navegador las pide solo cuando el admin decide verlas
// (POST /planificador/credenciales), y cada acceso queda en la bitácora.
function sinPassword(p) {
  if (!p) return p;
  const { password, ...resto } = p;
  return { ...resto, tienePassword: !!password };
}

async function registrarAccesoCredencial(req, motivo, idPantallas) {
  try {
    await AccesoCredencial.create({
      usuarioId:    req.user?.id ?? null,
      usuarioEmail: req.user?.email ?? null,
      motivo,
      cantidad:     idPantallas.length,
      idPantallas:  JSON.stringify(idPantallas.slice(0, 1000)),
      ip:           req.ip || null,
    });
  } catch (e) {
    console.warn('[CREDENCIALES] No se pudo registrar el acceso:', e.message);
  }
}

function enrichPantalla(raw) {
  const diasVencimiento     = calcDiasDB(raw.finalizacion);
  const diasVencimientoReal = calcDiasDB(raw.duracionReal);
  return {
    ...raw,
    diasVencimiento,
    diasVencimientoReal,
    estado:     estadoFromDias(diasVencimiento),
    estadoReal: estadoFromDias(diasVencimientoReal),
    alerta:     '',
    cortesia:   esCortesia(raw.cortesia),
    alertaReal: alertaFromDias(diasVencimientoReal, raw.cortesia),
  };
}

// ─── Helpers de exportación a Excel (recuadro CUENTA) ──────────────────────
// Replican rowHelpers.js (cliente) para que el archivo exportado tenga el
// mismo color de fila y de badges "Estado"/"Alerta" que se ve en la tabla.

// Misma regla que la UI (utils/planificadorAlerta.varianteDe)
const getRowVariantExport = (p, diasAlerta) => varianteDe(p, diasAlerta);

const ROW_FILL = {
  vigente:  'FFF0FDF4', // green-50
  alerta:   'FFFFFBEB', // amber-50
  vencido:  'FFFEF2F2', // red-50
  cortesia: 'FFFFF7ED', // orange-50
  libre:    'FFF9FAFB', // gray-50
};

const BADGE_COLORS = {
  success: ['FFDCFCE7', 'FF15803D'], // verde
  error:   ['FFFEE2E2', 'FFB91C1C'], // rojo
  warning: ['FFFEF3C7', 'FFB45309'], // ámbar
  orange:  ['FFFFEDD5', 'FFC2410C'], // naranja (cortesía)
  neutral: ['FFF3F4F6', 'FF374151'], // gris
};

function estadoBadgeVariantExport(estado) {
  switch ((estado || '').toUpperCase()) {
    case 'VIGENTE':  return 'success';
    case 'VENCIDO':  return 'error';
    case 'CORTESIA': return 'orange';
    case 'ALERTA':
    case 'PROXIMO A VENCER': return 'warning';
    default: return 'neutral';
  }
}

// Replica la lógica de "Tipo Plan" de la tabla (rowHelpers.js: getPlanSortVal)
function tipoPlanBadgeExport(p) {
  if (p.tipoPlan) return { text: p.tipoPlan, variant: 'orange' };
  const d = p.duracionPlan != null ? Math.floor(Number(p.duracionPlan)) : null;
  if (d === 14)  return { text: 'Plan Anual', variant: 'success' };
  if (d === 7)   return { text: 'Plan Semestral', variant: 'warning' };
  if (d === 1)   return { text: 'Plan Mensual', variant: 'neutral' };
  if (d != null) return { text: 'REVISAR', variant: 'error' };
  return null;
}

function diasFontColor(dias, diasAlerta) {
  if (dias == null) return 'FF9CA3AF'; // gray-400
  if (dias <= 0) return 'FFDC2626';    // red-600
  if (dias <= diasAlerta) return 'FFD97706'; // amber-600
  return 'FF15803D'; // green-700
}

// Las fechas DATEONLY llegan como "YYYY-MM-DD"; se muestran como en la tabla (DD-MM-YYYY)
function fmtDateDMY(d) {
  if (!d) return '';
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(d);
}

// Construye el workbook ExcelJS del Planificador (usado por /export)
function buildPlanificadorWorkbook(pantallas) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Planificador');

  const HEADERS = [
    'ID Cuenta', 'Cuenta', 'Contraseña', 'Crédito', 'Inicio', 'Fin', 'Días', 'Estado', 'Alerta',
    'Nombre', 'Apellido', 'Pantalla', 'Customer ID', 'Nickname',
    '#', 'Duración', 'Tipo Plan', 'Ini. Real', 'Fin Real', 'Días R.', 'Estado R.', 'Alerta R.', 'Debe',
  ];
  const WIDTHS = [
    10, 18, 16, 10, 12, 12, 8, 13, 13,
    16, 16, 11, 12, 18,
    6, 10, 16, 12, 12, 8, 13, 13, 16,
  ];
  sheet.columns = WIDTHS.map(width => ({ width }));

  // Bandas de grupo CUENTA / CLIENTE / PLAN (mismos colores que el encabezado de la tabla)
  const GROUPS = [
    { label: 'CUENTA',  from: 1,  to: 9,  color: 'FF1D4ED8' },
    { label: 'CLIENTE', from: 10, to: 14, color: 'FF047857' },
    { label: 'PLAN',    from: 15, to: 23, color: 'FF7E22CE' },
  ];
  GROUPS.forEach(g => {
    sheet.mergeCells(1, g.from, 1, g.to);
    const cell = sheet.getCell(1, g.from);
    cell.value = g.label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: g.color } };
  });
  sheet.getRow(1).height = 22;

  // Encabezados de columna
  const headerRow = sheet.getRow(2);
  HEADERS.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: 'FF4B5563' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  sheet.views = [{ state: 'frozen', ySplit: 2 }];

  // Filas de datos, con el color según el estado de la pantalla (igual que la tabla)
  pantallas.forEach((p, idx) => {
    const variant  = getRowVariantExport(p, DIAS_ALERTA);
    const row      = sheet.getRow(idx + 3);
    const tipoPlan = tipoPlanBadgeExport(p);

    const values = [
      p.cuentaId, p.cuenta || '', p.password || '', p.credito ?? '',
      fmtDateDMY(p.inicio), fmtDateDMY(p.finalizacion),
      p.diasVencimiento != null ? `${p.diasVencimiento}d` : '', p.estado || '', p.alerta || '',
      p.nombre || '', p.apellido || '', p.idPantalla || '', p.customerId || '', p.nickname || '',
      p.pantallas ?? '', p.duracionPlan != null ? Math.floor(Number(p.duracionPlan)) : '',
      tipoPlan ? tipoPlan.text : '',
      fmtDateDMY(p.inicioReal), fmtDateDMY(p.duracionReal),
      p.diasVencimientoReal != null ? `${p.diasVencimientoReal}d` : '',
      p.estadoReal || '', p.alertaReal || '',
      p.debe
        ? [
            'Debe',
            p.montoDebe    ? `$${Number(p.montoDebe).toLocaleString('es-CO')} COP` : '',
            p.montoDebeUSD ? `US$${Number(p.montoDebeUSD).toLocaleString('en-US')}` : '',
          ].filter(Boolean).join(' · ')
        : '',
    ];

    values.forEach((val, i) => {
      const cell = row.getCell(i + 1);
      cell.value = val;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_FILL[variant] } };
      cell.alignment = { vertical: 'middle', horizontal: (i < 3 || (i >= 9 && i <= 13)) ? 'left' : 'center' };
    });

    // Días / Días R. — color de fuente según vencimiento (igual que la tabla)
    row.getCell(7).font  = { color: { argb: diasFontColor(p.diasVencimiento, DIAS_ALERTA) }, bold: true };
    row.getCell(20).font = { color: { argb: diasFontColor(p.diasVencimientoReal, DIAS_ALERTA) }, bold: true };

    // Badges: Estado, Alerta, Estado R., Alerta R.
    [[8, p.estado], [9, p.alerta], [21, p.estadoReal], [22, p.alertaReal]].forEach(([col, val]) => {
      if (!val) return;
      const [bg, fg] = BADGE_COLORS[estadoBadgeVariantExport(val)];
      const cell = row.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.font = { bold: true, color: { argb: fg } };
    });

    // Badge Tipo Plan
    if (tipoPlan) {
      const [bg, fg] = BADGE_COLORS[tipoPlan.variant];
      const cell = row.getCell(17);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.font = { bold: true, color: { argb: fg } };
    }

    // Badge Debe
    if (p.debe) {
      const [bg, fg] = BADGE_COLORS.error;
      const cell = row.getCell(23);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.font = { bold: true, color: { argb: fg } };
    }
  });

  return workbook;
}

// ============ PLANIFICADOR (DB + Excel import) ============

// GET /planificador — lee desde DB, auto-importa desde Excel si está vacía,
// y aplica autocorrección de cuentaId en cada carga (self-healing).
router.get('/planificador', asyncHandler(async (_req, res) => {
  // Lectura pura: las correcciones (autofix de cuentaId, duraciones enteras,
  // pantallas libres de cuentas padre nuevas) corren al arrancar el servidor y
  // tras cada cambio que las necesita — no en cada carga de la página.
  const count = await Planificador.count();
  if (count === 0) await autoImportarSiDisponible(importFromExcel);
  const records = await Planificador.findAll({ order: [['cuentaId', 'ASC'], ['idPantalla', 'ASC']] });
  // Datos de cuenta (usuario, crédito, fechas) desde Cuentas Padre: única fuente
  const cuentas = await mapaCuentas();
  const pantallas = (await conCuentaPadre(records.map(r => r.toJSON()), { cuentas })).map(enrichPantalla);

  // ── Cuentas Padre: estado en tiempo real ────────────────────────────────
  const cps = [...cuentas.values()];
  const cpMap = Object.fromEntries(cps.map(cp => [String(cp.cuentaId).trim(), cp]));

  const cuentasPadreStatus = cps.map(cp => {
    const diasAlFin = calcDiasDB(cp.fechaFin);
    return {
      cuentaId: cp.cuentaId,
      nombre:   cp.nombreUsuario || null,
      fin:      cp.fechaFin      || null,
      diasAlFin,
      variante: calcCPVariante(diasAlFin),
      estado:   cp.estado || null,
    };
  }).sort((a, b) => (a.diasAlFin ?? Infinity) - (b.diasAlFin ?? Infinity));

  // ── Capacidad por cuenta (pantallas totales vs. libres/ocupadas) ────────
  const byAccount = {};
  pantallas.forEach(p => {
    if (!byAccount[p.cuentaId]) byAccount[p.cuentaId] = [];
    byAccount[p.cuentaId].push(p);
  });
  const capacidadPorCuenta = Object.entries(byAccount).map(([cuentaId, rows]) => {
    const cp       = cpMap[cuentaId];
    const capacidad = rows.reduce((s, p) => s + (Number(p.pantallas) || 1), 0);
    const libres    = rows
      .filter(p => getRowVariantExport(p, DIAS_ALERTA) === 'libre')
      .reduce((s, p) => s + (Number(p.pantallas) || 1), 0);
    const ocupadas  = capacidad - libres;
    const diasAlFin = cp ? calcDiasDB(cp.fechaFin) : null;
    return {
      cuentaId,
      nombre:      cp?.nombreUsuario || null,
      diasAlFin,
      varianteCp:  calcCPVariante(diasAlFin),
      capacidad,
      ocupadas,
      libres,
      pctOcupacion: capacidad ? Math.round((ocupadas / capacidad) * 100) : 0,
    };
  }).sort((a, b) => a.cuentaId.localeCompare(b.cuentaId));

  res.json({
    diasAlerta: DIAS_ALERTA,
    pantallas: pantallas.map(sinPassword),
    inconsistencias:     findCuentaIdMismatches(pantallas),
    cuentasPadreStatus,
    capacidadPorCuenta,
  });
}));

// Comprobante de renovación: último pago de la pantalla en la tabla de ventas
// (módulo Pagos) + teléfono del cliente para reenviarlo por WhatsApp.
// Vínculo con Pagos: idPantalla + customerId, con el nickname como respaldo
// (ver utils/ultimosPagos.js) — renombrar un nickname ya no pierde el pago.
// También devuelve las pantallas del cliente (agrupadas por customerId) con su
// último pago y si están AL DÍA, y el catálogo activo para el mensaje de
// renovación. Todo con un número fijo de consultas (sin N+1). Las contraseñas
// NO se incluyen: se piden aparte con POST /planificador/credenciales.
router.get('/planificador/comprobante/:nickname', asyncHandler(async (req, res) => {
  const nickname   = String(req.params.nickname || '').trim();
  const idPantalla = String(req.query.idPantalla || '').trim();
  let customerId   = String(req.query.customerId || '').trim() || null;

  const filas = customerId
    ? await Planificador.findAll({
        where: {
          customerId,
          nickname: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: '' }, { [Op.notLike]: '%libre%' }] },
        },
        attributes: ['idPantalla', 'nickname', 'customerId', 'duracionReal', 'debe', 'montoDebe', 'montoDebeUSD', 'cuentaId', 'cuenta', 'pantallas'],
        order: [['nickname', 'ASC']],
        raw: true,
      })
    : [];

  // Usuario IPTV de cada pantalla: el de su cuenta padre
  const filasCuenta = await conCuentaPadre(filas);
  filas.forEach((f, i) => { f.cuenta = filasCuenta[i].cuenta; });
  const objetivo = { idPantalla, customerId, nickname };
  const pagos = await buscarUltimosPagos([objetivo, ...filas]);
  const pago = pagos.get(idPantalla || `nick:${nickname}`) || null;

  // Sin customerId en la fila se usa el de la última venta (comportamiento previo)
  if (!customerId) customerId = pago?.customerId || null;
  // Teléfono: el de la ficha del cliente (Client.phone) o el móvil de Tabla
  // Clientes; el país permite poner el indicativo correcto en WhatsApp.
  let telefono = null;
  let pais = null;
  let tipoCliente = null; // Final / Individual / Revendedor → Tipo Pantalla de la venta
  if (customerId) {
    const [cliente, ficha] = await Promise.all([
      Client.findOne({ where: { customerId }, attributes: ['phone'] }),
      TablaCliente.findByPk(customerId, { attributes: ['movil', 'pais', 'tipoCliente'] }),
    ]);
    telefono = (cliente?.phone || '').trim() || (ficha?.movil || '').trim() || null;
    pais = (ficha?.pais || '').trim() || null;
    tipoCliente = (ficha?.tipoCliente || '').trim() || null;
  }

  // Cada pantalla con su último pago y si está AL DÍA (fecha vigente, sin
  // marca "debe" y con pago registrado). El comprobante lista al día /
  // vencidas, permite ocultar cuentas y consolida la suma de las al día.
  const pantallasDetalle = filas.map((f) => {
    const ultimo = pagos.get(f.idPantalla) || null;
    const dias = calcDiasDB(f.duracionReal);
    return {
      idPantalla:   f.idPantalla,
      nickname:     f.nickname,
      cuentaId:     f.cuentaId,
      cuenta:       f.cuenta,
      pantallas:    f.pantallas,
      finPlan:      f.duracionReal,
      dias,
      debe:         !!f.debe,
      montoDebe:    f.montoDebe,
      montoDebeUSD: f.montoDebeUSD,
      alDia:        dias != null && dias > 0 && !f.debe && !!ultimo,
      pago:         ultimo ? { tipoPlan: ultimo.tipoPlan, precioVenta: ultimo.precioVenta, fecha: ultimo.fecha, vinculo: ultimo.vinculo } : null,
    };
  });
  const pantallasCliente = Math.max(1, pantallasDetalle.length);

  const catalogo = await Plan.findAll({
    where: { activo: true },
    attributes: ['nombre', 'precio', 'duracionDias', 'numeroPantallas'],
    order: [['numeroPantallas', 'ASC'], ['duracionDias', 'ASC']],
  });

  res.json({ pago, telefono, pais, tipoCliente, pantallasCliente, catalogo, pantallasDetalle });
}));

// POST /planificador/credenciales — devuelve las contraseñas de las pantallas
// pedidas y deja constancia de quién las vio, cuándo y para qué.
const MOTIVOS_CREDENCIAL = new Set(['tabla', 'estatus', 'comprobante', 'edicion']);
router.post('/planificador/credenciales', asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.idPantallas)
    ? [...new Set(req.body.idPantallas.map(v => String(v || '').trim()).filter(Boolean))]
    : [];
  const motivo = String(req.body?.motivo || '').trim();
  if (!ids.length) return res.status(400).json({ error: 'Indica al menos una pantalla (idPantallas).' });
  if (ids.length > 1000) return res.status(400).json({ error: 'Máximo 1000 pantallas por solicitud.' });
  if (!MOTIVOS_CREDENCIAL.has(motivo)) return res.status(400).json({ error: 'Motivo de acceso no válido.' });

  // La contraseña vive (cifrada) en Cuentas Padre; la columna del Planificador
  // es solo respaldo para pantallas cuya cuenta no está en Cuentas Padre.
  const filas = await conCuentaPadre(await Planificador.findAll({ where: { idPantalla: { [Op.in]: ids } }, attributes: ['idPantalla', 'cuentaId', 'password'], raw: true }));
  await registrarAccesoCredencial(req, motivo, filas.map(f => f.idPantalla));
  res.json({ credenciales: Object.fromEntries(filas.map(f => [f.idPantalla, f.password || ''])) });
}));

// GET /planificador/credenciales/accesos — bitácora de accesos (más recientes primero)
router.get('/planificador/credenciales/accesos', asyncHandler(async (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  const accesos = await AccesoCredencial.findAll({ order: [['createdAt', 'DESC']], limit, raw: true });
  res.json({ accesos: accesos.map(a => ({ ...a, idPantallas: (() => { try { return JSON.parse(a.idPantallas || '[]') } catch { return [] } })() })) });
}));

// POST /planificador/recordatorios — registra un recordatorio/comprobante enviado
const TIPOS_RECORDATORIO  = new Set(['renovacion', 'comprobante']);
const ETAPAS_COBRO = new Set(['antes', 'dia', 'despues']);
const CANALES_RECORDATORIO = new Set(['whatsapp', 'copiado']);
router.post('/planificador/recordatorios', asyncHandler(async (req, res) => {
  const idPantalla = String(req.body?.idPantalla || '').trim();
  const tipo  = String(req.body?.tipo || '').trim();
  const canal = String(req.body?.canal || '').trim();
  if (!idPantalla) return res.status(400).json({ error: 'idPantalla es obligatorio.' });
  if (!TIPOS_RECORDATORIO.has(tipo) || !CANALES_RECORDATORIO.has(canal)) {
    return res.status(400).json({ error: 'Tipo o canal de recordatorio no válido.' });
  }
  const etapa = req.body?.etapa ? String(req.body.etapa).trim() : null;
  if (etapa && !ETAPAS_COBRO.has(etapa)) return res.status(400).json({ error: 'Etapa de cobro no válida.' });
  const pantalla = await Planificador.findByPk(idPantalla, { raw: true });
  if (!pantalla) return res.status(404).json({ error: 'Pantalla no encontrada' });

  const dias = calcDiasDB(pantalla.duracionReal);
  const rec = await Recordatorio.create({
    idPantalla,
    nickname:        pantalla.nickname || null,
    customerId:      pantalla.customerId || null,
    tipo,
    canal,
    etapa:           tipo === 'renovacion' ? etapa : null,
    estadoAlEnviar:  estadoFromDias(dias) || null,
    diasAlEnviar:    dias,
    finPlanAlEnviar: pantalla.duracionReal || null,
    usuarioEmail:    req.user?.email || null,
  });
  res.status(201).json({ id: rec.id, idPantalla, tipo, canal, etapa: rec.etapa, createdAt: rec.createdAt });
}));

// GET /planificador/recordatorios/resumen?dias=30 — último recordatorio de
// renovación por pantalla + efectividad: de las pantallas recordadas en la
// ventana, cuántas renovaron después (su fin de plan se movió hacia adelante).
router.get('/planificador/recordatorios/resumen', asyncHandler(async (req, res) => {
  const dias = Math.min(365, Math.max(1, Number(req.query.dias) || 30));
  const desde = new Date(Date.now() - dias * 86400000);
  const recs = await Recordatorio.findAll({
    where: { tipo: 'renovacion', createdAt: { [Op.gte]: desde } },
    order: [['createdAt', 'ASC']],
    raw: true,
  });

  const ultimos = {};
  const primeroPorPantalla = {};
  for (const r of recs) {
    if (!primeroPorPantalla[r.idPantalla]) primeroPorPantalla[r.idPantalla] = r;
    ultimos[r.idPantalla] = { fecha: r.createdAt, canal: r.canal, total: (ultimos[r.idPantalla]?.total || 0) + 1 };
  }

  const ids = Object.keys(primeroPorPantalla);
  const actuales = ids.length
    ? await Planificador.findAll({ where: { idPantalla: { [Op.in]: ids } }, attributes: ['idPantalla', 'duracionReal'], raw: true })
    : [];
  const finActual = Object.fromEntries(actuales.map(a => [a.idPantalla, a.duracionReal]));
  const renovaron = ids.filter(id => {
    const antes = primeroPorPantalla[id].finPlanAlEnviar;
    const ahora = finActual[id];
    return ahora && (!antes || String(ahora) > String(antes));
  });
  renovaron.forEach(id => { if (ultimos[id]) ultimos[id].renovo = true; });

  // Secuencia de cobro: etapas ya enviadas en el CICLO actual de la pantalla
  // (recordatorios cuyo fin de plan al enviar es el fin de plan vigente). Si
  // la pantalla renovó, su ciclo cambió y la secuencia vuelve a empezar.
  for (const r of recs) {
    if (!r.etapa || !ultimos[r.idPantalla]) continue;
    if (String(r.finPlanAlEnviar || '') !== String(finActual[r.idPantalla] || '')) continue;
    const u = ultimos[r.idPantalla];
    u.etapas = [...new Set([...(u.etapas || []), r.etapa])];
  }

  res.json({
    dias,
    ultimos,
    efectividad: {
      enviados:  recs.length,
      pantallas: ids.length,
      renovaron: renovaron.length,
      tasa:      ids.length ? Math.round((renovaron.length / ids.length) * 100) : 0,
    },
  });
}));

// ── Renovación en un paso ───────────────────────────────────────────────
// GET /planificador/renovar/opciones — planes y medios de pago usados en Pagos
// + catálogo activo, para el formulario "Registrar renovación".
router.get('/planificador/renovar/opciones', asyncHandler(async (_req, res) => {
  const distintos = async (col) => (await Venta.findAll({
    attributes: [[Venta.sequelize.fn('DISTINCT', Venta.sequelize.col(col)), col]],
    where: { [col]: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: '' }] } },
    raw: true,
  })).map(r => String(r[col]).trim()).filter(Boolean);
  const [tiposPlan, mediosPago, skus, tiposFire, tiposPantalla, catalogo, skuFire] = await Promise.all([
    distintos('tipoPlan'),
    distintos('medioPago'),
    distintos('sku'),
    distintos('tipoFire'),
    distintos('tipoPantalla'),
    Plan.findAll({ where: { activo: true }, attributes: ['nombre', 'precio', 'duracionDias', 'numeroPantallas'], raw: true }),
    Venta.findAll({
      attributes: ['sku', 'tipoFire', 'fecha'],
      where: { sku: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: '' }] }, tipoFire: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: '' }] } },
      order: [['fecha', 'ASC']],
      raw: true,
    }),
  ]);
  const unicos = (l) => [...new Set(l)].sort((a, b) => a.localeCompare(b, 'es'));
  // Tipo de equipo más reciente registrado para cada SKU (al cambiar el SKU)
  const tipoFirePorSku = {};
  for (const v of skuFire) tipoFirePorSku[String(v.sku).trim()] = String(v.tipoFire).trim();
  res.json({
    tiposPlan: unicos(tiposPlan),
    mediosPago: unicos(mediosPago.filter(m => !/^cortes/i.test(m))),
    skus: unicos(skus),
    tiposFire: unicos(tiposFire),
    tiposPantalla: unicos(tiposPantalla),
    tipoFirePorSku,
    catalogo,
  });
}));

// POST /planificador/:idPantalla/renovar — crea la venta y extiende el plan
// en una sola transacción (ver services/renovacionService.js)
router.post('/planificador/:idPantalla/renovar', asyncHandler(async (req, res) => {
  try {
    const r = await registrarRenovacion(req.params.idPantalla, req.body || {}, req.user?.email);
    res.status(201).json({ ...r, pantalla: sinPassword(enrichPantalla(r.pantalla)) });
  } catch (e) {
    if (e instanceof ErrorRenovacion) return res.status(e.status).json({ error: e.message });
    throw e;
  }
}));

// ── Historial y deshacer ────────────────────────────────────────────────
// GET /planificador/historial?limit=50&idPantalla=…
router.get('/planificador/historial', asyncHandler(async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const where = req.query.idPantalla ? { idPantalla: String(req.query.idPantalla) } : {};
  const cambios = await PlanificadorCambio.findAll({ where, order: [['id', 'DESC']], limit });
  res.json({ cambios: cambios.map(presentar) });
}));

const responderDeshacer = (fn) => asyncHandler(async (req, res) => {
  try {
    res.json({ ok: true, ...(await fn(req)) });
  } catch (e) {
    if (e instanceof ConflictoDeshacer) return res.status(409).json({ error: e.message, detalles: e.detalles });
    throw e;
  }
});

// POST /planificador/historial/:id/deshacer — revierte un cambio puntual
router.post('/planificador/historial/:id/deshacer', responderDeshacer(async (req) => {
  const r = await deshacerCambio(Number(req.params.id), req.user?.email);
  return { resultado: r, message: `Cambio deshecho en la pantalla ${r.idPantalla}.` };
}));

// POST /planificador/historial/lote/:lote/deshacer — revierte una operación completa
router.post('/planificador/historial/lote/:lote/deshacer', responderDeshacer(async (req) => {
  const r = await deshacerLote(String(req.params.lote), req.user?.email);
  return { ...r, message: `${r.deshechos} cambio(s) deshecho(s).` };
}));

// GET /planificador/promos — promociones registradas en "Tipo de Plan" de las
// pantallas (p. ej. "3+1"). Pagos las usa para sugerirlas en Nueva Venta sin
// descargar el Planificador completo.
router.get('/planificador/promos', asyncHandler(async (_req, res) => {
  const filas = await Planificador.findAll({
    attributes: [[Planificador.sequelize.fn('DISTINCT', Planificador.sequelize.col('tipoPlan')), 'tipoPlan']],
    where: { tipoPlan: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: '' }] } },
    raw: true,
  });
  res.json({ promos: [...new Set(filas.map(f => String(f.tipoPlan).trim()).filter(Boolean))].sort() });
}));

// GET /planificador/export — descarga el Planificador completo como .xlsx
router.get('/planificador/export', asyncHandler(async (req, res) => {
  const records   = await Planificador.findAll({ order: [['cuentaId', 'ASC'], ['idPantalla', 'ASC']] });
  // El Excel incluye contraseñas: queda constancia en la bitácora
  await registrarAccesoCredencial(req, 'exportar_excel', records.map(r => r.idPantalla));
  const pantallas = (await conCuentaPadre(records.map(r => r.toJSON()))).map(enrichPantalla);
  const workbook  = buildPlanificadorWorkbook(pantallas);
  const fecha = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="Planificador_${fecha}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}));

// POST /planificador — crea una pantalla adicional dentro de una cuenta padre
// existente, manteniendo el mismo Usuario IPTV (bloque CUENTA compartido).
// Usado por "Crear pantalla adicional" del modal Editar Pantalla: p. ej. si la
// cuenta 087 tiene 087-1..087-3, el nuevo slot sugerido es 087-4.
router.post('/planificador', asyncHandler(async (req, res) => {
  const idPantalla = String(req.body.idPantalla || '').trim();
  const cuentaId   = String(req.body.cuentaId   || '').trim();
  if (!idPantalla) return res.status(400).json({ error: 'El ID de la nueva pantalla es obligatorio' });
  if (!cuentaId)   return res.status(400).json({ error: 'La cuenta padre (cuentaId) es obligatoria' });

  const conflict = await Planificador.findByPk(idPantalla);
  if (conflict) return res.status(409).json({ error: `Ya existe una pantalla con el ID "${idPantalla}". Elige otro.` });

  // Los datos de cuenta salen de Cuentas Padre (no se copian). Solo si la cuenta
  // no existe allí se heredan de una pantalla hermana (respaldo legado).
  const cp      = await CuentaPadre.findByPk(cuentaId);
  const hermana = cp ? null : await Planificador.findOne({ where: { cuentaId } });
  const base = cp ? {} : hermana ? {
    cuenta:       hermana.cuenta,
    password:     hermana.password,
    credito:      hermana.credito,
    inicio:       hermana.inicio,
    finalizacion: hermana.finalizacion,
  } : null;
  if (!base) return res.status(404).json({ error: `No existe la cuenta padre "${cuentaId}" ni pantallas registradas en ella.` });

  const record = await Planificador.create({
    idPantalla,
    cuentaId,
    ...base,
    nickname:  String(req.body.nickname || '').trim() || 'Libre',
    pantallas: 1,
    debe:      false,
  });
  await registrarCambio({ accion: 'crear', idPantalla, antes: null, despues: record, usuarioEmail: req.user?.email });
  res.status(201).json(sinPassword(enrichPantalla(await conCuentaPadre(record.toJSON()))));
}));

// PUT /planificador/:idPantalla — actualiza un registro
// Solo afecta a la pantalla editada (nunca a otras pantallas de la misma cuenta)
router.put('/planificador/:idPantalla', asyncHandler(async (req, res) => {
  const { idPantalla } = req.params;
  const pantalla = await Planificador.findByPk(idPantalla);
  if (!pantalla) return res.status(404).json({ error: 'Pantalla no encontrada' });

  // Usuario IPTV, contraseña, crédito y fechas de la CUENTA no se guardan aquí:
  // van a Cuentas Padre (abajo) y aplican a todas las pantallas de esa cuenta.
  const STRING_FIELDS = ['nombre', 'apellido', 'customerId', 'nickname', 'tipoPlan'];
  const FLOAT_FIELDS = ['porcentaje', 'montoDebe', 'montoDebeUSD'];
  // duracionPlan se guarda como meses enteros (el Excel de origen traía días/30 con decimales)
  const INT_FIELDS = ['pantallas', 'duracionPlan'];
  const DATE_FIELDS = ['inicioReal', 'duracionReal'];
  const EDITABLE_FIELDS = [...STRING_FIELDS, ...FLOAT_FIELDS, ...INT_FIELDS, ...DATE_FIELDS, 'debe'];

  const update = {};
  for (const f of EDITABLE_FIELDS) {
    if (req.body[f] === undefined) continue;
    const val = req.body[f];
    if (f === 'debe') update[f] = Boolean(val);
    else if (STRING_FIELDS.includes(f)) update[f] = (val ?? '').toString().trim() || null;
    else if (INT_FIELDS.includes(f)) update[f] = val !== '' && val != null ? Math.round(Number(val)) : null;
    else if (FLOAT_FIELDS.includes(f)) update[f] = val !== '' && val != null ? Number(val) : null;
    else if (DATE_FIELDS.includes(f)) update[f] = (val || '').toString().trim() || null;
  }
  // Cortesía: campo propio. Se acepta `cortesia` (booleano) o, por compatibilidad,
  // `alertaReal: 'CORTESIA'`. El texto calculado de alerta (VENCIDO, PROXIMO A
  // VENCER…) ya no se guarda; alertaReal solo conserva el marcador legado.
  if (req.body.cortesia !== undefined) update.cortesia = Boolean(req.body.cortesia);
  else if (req.body.alertaReal !== undefined) update.cortesia = esCortesia(req.body.alertaReal);
  if (update.cortesia !== undefined) update.alertaReal = update.cortesia ? 'CORTESIA' : null;

  // Si se desactiva "Debe", los montos adeudados (COP y USD) no deben persistir
  if (update.debe === false) { update.montoDebe = null; update.montoDebeUSD = null; }

  // Reasignar la pantalla a otra cuenta padre (cuentaId no admite null — es la clave de agrupación)
  if (req.body.cuentaId !== undefined && req.body.cuentaId && req.body.cuentaId !== pantalla.cuentaId) {
    update.cuentaId = String(req.body.cuentaId).trim();
  }

  // Cambiar el slot de pantalla (idPantalla = clave primaria) — solo si no choca con uno existente
  let finalId = idPantalla;
  if (req.body.idPantalla !== undefined && req.body.idPantalla) {
    const newId = String(req.body.idPantalla).trim();
    if (newId !== idPantalla) {
      const conflict = await Planificador.findByPk(newId);
      if (conflict) return res.status(409).json({ error: `Ya existe una pantalla con el ID "${newId}". Elige otro.` });
      update.idPantalla = newId;
      finalId = newId;
    }
  }

  if (Object.keys(update).length > 0) {
    await Planificador.update(update, { where: { idPantalla } });
  }
  // Datos de la cuenta → Cuentas Padre (de la cuenta final si se reasignó)
  const camposCuenta = await guardarDatosCuenta(update.cuentaId || pantalla.cuentaId, req.body);
  // Al mover la pantalla de cuenta o de slot se re-alinea cuentaId (antes lo
  // hacía la siguiente carga del Planificador)
  if (update.cuentaId || update.idPantalla) await autoFixCuentaIdMismatches();

  const updated = await Planificador.findByPk(finalId);
  await registrarCambio({ accion: 'editar', idPantalla, antes: pantalla, despues: updated, usuarioEmail: req.user?.email });
  res.json({ ...sinPassword(enrichPantalla(await conCuentaPadre(updated.toJSON()))), cuentaPadreActualizada: camposCuenta });
}));

// DELETE /planificador/:idPantalla — elimina un registro
router.delete('/planificador/:idPantalla', asyncHandler(async (req, res) => {
  const { idPantalla } = req.params;
  const pantalla = await Planificador.findByPk(idPantalla);
  if (!pantalla) return res.status(404).json({ error: 'Pantalla no encontrada' });
  await Planificador.destroy({ where: { idPantalla } });
  const cambio = await registrarCambio({ accion: 'eliminar', idPantalla, antes: pantalla, despues: null, usuarioEmail: req.user?.email });
  res.json({ message: `Pantalla ${idPantalla} eliminada`, cambioId: cambio?.id ?? null });
}));


// POST /planificador/import — fuerza re-importación desde Excel (sobrescribe DB)
// importFromExcel() aplica autofix internamente tras el import.
router.post('/planificador/import', asyncHandler(async (_req, res) => {
  const count = await importFromExcel();
  res.json({ message: `${count} pantallas importadas desde Excel` });
}));

module.exports = router;
