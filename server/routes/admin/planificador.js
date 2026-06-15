const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const { Planificador, CuentaPadre } = require('../../models');
const asyncHandler = require('../../middleware/asyncHandler');
const { importFromExcel } = require('../../services/planificadorImportService');

const DIAS_ALERTA = 8;

function calcDiasDB(fecha) {
  if (!fecha) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(fecha); if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function estadoFromDias(dias) {
  if (dias == null) return '';
  if (dias <= 0) return 'VENCIDO';
  if (dias <= DIAS_ALERTA) return 'ALERTA';
  return 'VIGENTE';
}

// La alerta se recalcula según la fecha vigente; "CORTESIA" es un valor manual que se respeta
function alertaFromDias(dias, stored) {
  if ((stored || '').trim().toUpperCase() === 'CORTESIA') return 'CORTESIA';
  if (dias == null) return '';
  if (dias <= 0) return 'VENCIDO';
  if (dias <= DIAS_ALERTA) return 'PROXIMO A VENCER';
  return '';
}

// Detecta pantallas cuyo cuentaId no coincide con el prefijo de su idPantalla
// (p. ej. "M037-3" con cuentaId "M038"). Es la causa raíz del "corrimiento" de
// datos de cuenta entre pantallas vecinas tras un import/sync — suele originarse
// en un error de captura en el Excel fuente.
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
    alertaReal: alertaFromDias(diasVencimientoReal, raw.alertaReal),
  };
}

// ─── Helpers de exportación a Excel (recuadro CUENTA) ──────────────────────
// Replican rowHelpers.js (cliente) para que el archivo exportado tenga el
// mismo color de fila y de badges "Estado"/"Alerta" que se ve en la tabla.

function getRowVariantExport(p, diasAlerta) {
  const nombre = (String(p.nombre ?? '') + String(p.apellido ?? '')).trim();
  const nickname = (p.nickname || '').trim();
  if (nickname.toLowerCase().includes('libre')) return 'libre';
  if (!nombre && !nickname) return 'libre';
  const dias = p.duracionReal != null ? p.diasVencimientoReal : p.diasVencimiento;
  if (dias != null && dias <= 0) return 'vencido';
  if (p.alertaReal === 'CORTESIA') return 'cortesia';
  if (dias != null && dias <= diasAlerta) return 'alerta';
  return 'vigente';
}

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

// ============ PLANIFICADOR (DB + Excel import) ============

// GET /planificador — lee desde DB, auto-importa desde Excel si está vacía
router.get('/planificador', asyncHandler(async (_req, res) => {
  const count = await Planificador.count();
  if (count === 0) await importFromExcel();
  const records = await Planificador.findAll({ order: [['cuentaId', 'ASC'], ['idPantalla', 'ASC']] });
  const pantallas = records.map(r => enrichPantalla(r.toJSON()));
  res.json({ diasAlerta: DIAS_ALERTA, pantallas, inconsistencias: findCuentaIdMismatches(pantallas) });
}));

// GET /planificador/export — exporta TODAS las columnas de la tabla del Planificador
// (CUENTA, CLIENTE y PLAN) a Excel, con las mismas bandas de grupo, colores de fila
// por estado y badges que se ven en pantalla
router.get('/planificador/export', asyncHandler(async (_req, res) => {
  const records   = await Planificador.findAll({ order: [['cuentaId', 'ASC'], ['idPantalla', 'ASC']] });
  const pantallas = records.map(r => enrichPantalla(r.toJSON()));

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
      p.debe ? (p.montoDebe ? `Debe ($${Number(p.montoDebe).toLocaleString('es-CO')})` : 'Debe') : '',
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

  const fecha = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="Planificador_${fecha}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}));

// PUT /planificador/:idPantalla — actualiza un registro
// Solo afecta a la pantalla editada (nunca a otras pantallas de la misma cuenta)
router.put('/planificador/:idPantalla', asyncHandler(async (req, res) => {
  const { idPantalla } = req.params;
  const pantalla = await Planificador.findByPk(idPantalla);
  if (!pantalla) return res.status(404).json({ error: 'Pantalla no encontrada' });

  const STRING_FIELDS = ['cuenta', 'password', 'nombre', 'apellido', 'customerId', 'nickname', 'alertaReal', 'tipoPlan'];
  const FLOAT_FIELDS = ['credito', 'duracionPlan', 'porcentaje', 'montoDebe'];
  const INT_FIELDS = ['pantallas'];
  const DATE_FIELDS = ['inicio', 'finalizacion', 'inicioReal', 'duracionReal'];
  const EDITABLE_FIELDS = [...STRING_FIELDS, ...FLOAT_FIELDS, ...INT_FIELDS, ...DATE_FIELDS, 'debe'];

  const update = {};
  for (const f of EDITABLE_FIELDS) {
    if (req.body[f] === undefined) continue;
    const val = req.body[f];
    if (f === 'debe') update[f] = Boolean(val);
    else if (STRING_FIELDS.includes(f)) update[f] = (val ?? '').toString().trim() || null;
    else if (FLOAT_FIELDS.includes(f) || INT_FIELDS.includes(f)) update[f] = val !== '' && val != null ? Number(val) : null;
    else if (DATE_FIELDS.includes(f)) update[f] = (val || '').toString().trim() || null;
  }
  // Si se desactiva "Debe", el monto adeudado no debe persistir
  if (update.debe === false) update.montoDebe = null;

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

  const updated = await Planificador.findByPk(finalId);
  res.json(enrichPantalla(updated.toJSON()));
}));

// DELETE /planificador/:idPantalla — elimina un registro
router.delete('/planificador/:idPantalla', asyncHandler(async (req, res) => {
  const { idPantalla } = req.params;
  const pantalla = await Planificador.findByPk(idPantalla);
  if (!pantalla) return res.status(404).json({ error: 'Pantalla no encontrada' });
  await Planificador.destroy({ where: { idPantalla } });
  res.json({ message: `Pantalla ${idPantalla} eliminada` });
}));

// POST /planificador/restore — restaura el planificador a un snapshot previo (deshacer)
const PLANIFICADOR_FIELDS = [
  'idPantalla', 'cuentaId', 'cuenta', 'password', 'credito', 'inicio', 'finalizacion',
  'nombre', 'apellido', 'customerId', 'nickname', 'pantallas', 'duracionPlan',
  'inicioReal', 'duracionReal', 'alertaReal', 'porcentaje', 'tipoPlan',
];
router.post('/planificador/restore', asyncHandler(async (req, res) => {
  const snapshot = req.body;
  if (!Array.isArray(snapshot)) return res.status(400).json({ error: 'Se esperaba un arreglo de registros' });

  const snapshotIds = snapshot.map(r => r.idPantalla);
  if (snapshotIds.length > 0) {
    await Planificador.destroy({ where: { idPantalla: { [Op.notIn]: snapshotIds } } });
  } else {
    await Planificador.destroy({ where: {} });
  }

  if (snapshot.length > 0) {
    const records = snapshot.map(r => {
      const record = {};
      for (const f of PLANIFICADOR_FIELDS) record[f] = r[f] ?? null;
      return record;
    });
    await Planificador.bulkCreate(records, {
      updateOnDuplicate: PLANIFICADOR_FIELDS.filter(f => f !== 'idPantalla'),
    });
  }

  const records   = await Planificador.findAll({ order: [['cuentaId', 'ASC'], ['idPantalla', 'ASC']] });
  const pantallas = records.map(r => enrichPantalla(r.toJSON()));
  res.json({ message: 'Planificador restaurado al estado anterior', diasAlerta: DIAS_ALERTA, pantallas, inconsistencias: findCuentaIdMismatches(pantallas) });
}));

// POST /planificador/sync-cuentas-padre — sincroniza datos de cuenta desde Cuentas Padre
router.post('/planificador/sync-cuentas-padre', asyncHandler(async (_req, res) => {
  const cuentas = await CuentaPadre.findAll();
  if (cuentas.length === 0)
    return res.status(404).json({ error: 'No hay cuentas padre en la base de datos' });

  const cuentaMap = {};
  cuentas.forEach(c => { cuentaMap[String(c.cuentaId).trim()] = c; });

  let updatedScreens = 0;
  let updatedGroups  = 0;
  let skipped        = 0;

  for (const [cuentaId, cp] of Object.entries(cuentaMap)) {
    const [affectedCount] = await Planificador.update(
      {
        cuenta:       cp.nombreUsuario || null,
        password:     cp.contrasena    || null,
        credito:      cp.credito       ?? null,
        inicio:       cp.fechaInicio   || null,
        finalizacion: cp.fechaFin      || null,
      },
      { where: { cuentaId } }
    );

    if (affectedCount === 0) { skipped++; continue; }

    updatedScreens += affectedCount;
    updatedGroups++;
  }

  const records   = await Planificador.findAll({ order: [['cuentaId', 'ASC'], ['idPantalla', 'ASC']] });
  const pantallas = records.map(r => enrichPantalla(r.toJSON()));
  const inconsistencias = findCuentaIdMismatches(pantallas);

  const skippedNote = skipped > 0 ? ` · ${skipped} sin pantallas asociadas (omitida${skipped === 1 ? '' : 's'})` : '';
  const inconsistenciasNote = inconsistencias.length > 0
    ? ` · ${inconsistencias.length} pantalla(s) con ID de cuenta desalineado`
    : '';

  res.json({
    message: `${updatedGroups} cuenta(s) sincronizada(s) · ${updatedScreens} pantalla(s) actualizada(s)${skippedNote}${inconsistenciasNote}`,
    updatedGroups,
    updatedScreens,
    diasAlerta: DIAS_ALERTA,
    pantallas,
    inconsistencias,
  });
}));

// POST /planificador/import — fuerza re-importación desde Excel (sobrescribe DB)
router.post('/planificador/import', asyncHandler(async (_req, res) => {
  const count = await importFromExcel();
  res.json({ message: `${count} pantallas importadas desde Excel` });
}));

module.exports = router;
