const express = require('express');
const router = express.Router();
const path = require('path');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const multer = require('multer');
const { CuentaPadre } = require('../../models');
const asyncHandler = require('../../middleware/asyncHandler');

const upload = multer({ storage: multer.memoryStorage() });

// ─── Helpers de exportación a Excel ────────────────────────────────────────
// Replican CuentasPadrePage.jsx para que el archivo exportado tenga el mismo
// encabezado, color de fila por estado y badge de "Estado" que se ve en pantalla

const DIAS_ALERTA_CP = 30;

function diasHastaExport(fecha) {
  if (!fecha) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(fecha); if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function getVarianteExport(dias) {
  if (dias === null) return 'sin_fecha';
  if (dias <= 0) return 'vencida';
  if (dias <= DIAS_ALERTA_CP) return 'alerta';
  return 'valida';
}

const ROW_FILL_CP = {
  valida:    'FFF0FDF4', // green-50
  alerta:    'FFFFFBEB', // amber-50
  vencida:   'FFFEF2F2', // red-50
  sin_fecha: 'FFF9FAFB', // gray-50
};

function diasFontColorCP(dias) {
  if (dias == null) return 'FF9CA3AF';        // gray-400
  if (dias <= 0) return 'FFDC2626';           // red-600
  if (dias <= DIAS_ALERTA_CP) return 'FFD97706'; // amber-600
  return 'FF374151';                          // gray-700
}

function estadoBadgeCP(estado) {
  const v = (estado || '').trim();
  if (v === 'Válido') return ['FFDCFCE7', 'FF15803D'];                       // verde
  if (v === 'Vencido' || v === 'Inactivo') return ['FFFEE2E2', 'FFB91C1C'];  // rojo
  return ['FFF3F4F6', 'FF6B7280'];                                           // gris
}

// fechaInicio/fechaFin llegan como "YYYY-MM-DD"; se muestran como en la tabla (DD-MM-YYYY)
function fmtDateDMYCP(d) {
  if (!d) return '';
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(d);
}

// ============ CUENTAS PADRE CRUD ============

async function importCuentasPadre(clearFirst = false) {
  if (clearFirst) await CuentaPadre.destroy({ where: {} });
  const filePath = path.join(__dirname, '../../../Tablas/Tabla_Cuentaspadre.xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const records = raw.slice(1)
    .filter(row => row[0])
    .map(row => ({
      cuentaId:      String(row[0]).trim(),
      nombreUsuario: row[1] ? String(row[1]).trim() : null,
      contrasena:    row[2] != null ? String(row[2]).trim() : null,
      credito:       row[3] != null ? Number(row[3]) : null,
      fechaInicio:   row[4] ? String(row[4]).split(' ')[0] : null,
      fechaFin:      row[5] ? String(row[5]).split(' ')[0] : null,
      smartTv:       row[6] ? String(row[6]).trim() : null,
      estado:        row[7] ? String(row[7]).trim() : null,
    }));
  if (records.length > 0) {
    await CuentaPadre.bulkCreate(records, {
      updateOnDuplicate: ['nombreUsuario', 'contrasena', 'credito', 'fechaInicio', 'fechaFin', 'smartTv', 'estado'],
    });
  }
  return records.length;
}

router.get('/cuentas-padre', asyncHandler(async (_req, res) => {
  const count = await CuentaPadre.count();
  if (count === 0) await importCuentasPadre();
  const rows = await CuentaPadre.findAll({ order: [['cuentaId', 'ASC']] });
  res.json(rows);
}));

// GET /cuentas-padre/export — exporta todos los campos de la tabla a Excel,
// con el mismo encabezado naranja, color de fila por estado y badge de
// "Estado" que se ve en la página Cuentas Padre
router.get('/cuentas-padre/export', asyncHandler(async (_req, res) => {
  const rows = await CuentaPadre.findAll({ order: [['cuentaId', 'ASC']] });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Cuentas Padre');

  const HEADERS = ['ID Cuenta', 'Usuario', 'Contraseña', 'Crédito', 'Inicio', 'Fin', 'Días', 'SmartTV', 'Estado'];
  const WIDTHS  = [12, 22, 18, 10, 12, 12, 10, 12, 12];
  sheet.columns = WIDTHS.map(width => ({ width }));

  const headerRow = sheet.getRow(1);
  HEADERS.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } }; // orange-600
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  headerRow.height = 22;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  rows.forEach((r, idx) => {
    const data    = r.toJSON();
    const dias    = diasHastaExport(data.fechaFin);
    const variant = getVarianteExport(dias);
    const row     = sheet.getRow(idx + 2);

    const values = [
      data.cuentaId, data.nombreUsuario || '', data.contrasena || '', data.credito ?? '',
      fmtDateDMYCP(data.fechaInicio), fmtDateDMYCP(data.fechaFin),
      dias != null ? (dias <= 0 ? 'VENCIDA' : `${dias}d`) : '',
      data.smartTv || '', data.estado || '',
    ];

    values.forEach((val, i) => {
      const cell = row.getCell(i + 1);
      cell.value = val;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_FILL_CP[variant] } };
      cell.alignment = { vertical: 'middle', horizontal: (i === 1 || i === 2) ? 'left' : 'center' };
    });

    // Fin / Días — color de fuente según vencimiento (igual que la tabla)
    row.getCell(6).font = { color: { argb: diasFontColorCP(dias) }, bold: dias != null && dias <= DIAS_ALERTA_CP };
    row.getCell(7).font = { color: { argb: diasFontColorCP(dias) }, bold: true };

    // Badge Estado
    if (data.estado) {
      const [bg, fg] = estadoBadgeCP(data.estado);
      const cell = row.getCell(9);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.font = { bold: true, color: { argb: fg } };
    }
  });

  const fecha = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="CuentasPadre_${fecha}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}));

router.post('/cuentas-padre/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Detectar la fila de encabezados exigiendo "usuario" Y "contraseña" en la
  // misma fila — el archivo puede traer filas de título sueltas antes
  // (ej. "Datos del usuario final") que no son la fila de columnas real
  const headerIdx = raw.findIndex(r =>
    Array.isArray(r) &&
    r.some(c => /usuario/i.test(String(c || ''))) &&
    r.some(c => /contrase/i.test(String(c || '')))
  );
  if (headerIdx === -1) {
    return res.status(400).json({ error: 'No se encontró una fila de encabezados con las columnas "Nombre de usuario" y "Contraseña"' });
  }
  const header = raw[headerIdx].map(h => String(h || '').toLowerCase().trim());
  const colIdx = (regex) => header.findIndex(h => regex.test(h));
  const idx = {
    nombreUsuario: colIdx(/usuario/),
    contrasena:    colIdx(/contrase/),
    credito:       colIdx(/cr[eé]dito/),
    fechaInicio:   colIdx(/inicio/),
    fechaFin:      colIdx(/fin/),
    smartTv:       colIdx(/smart/),
    estado:        colIdx(/estado/),
  };

  const val = (row, key) => {
    const i = idx[key];
    return i > -1 && row[i] != null && row[i] !== '' ? row[i] : null;
  };

  // Cargar todos los registros existentes para búsqueda por usuario
  const existing = await CuentaPadre.findAll({ attributes: ['cuentaId', 'nombreUsuario'] });

  // Mapa nombreUsuario → cuentaId (para resolver filas sin ID)
  const byUsername = {};
  existing.forEach(r => {
    if (r.nombreUsuario) byUsername[r.nombreUsuario.trim().toLowerCase()] = r.cuentaId;
  });

  // Siguiente M-número disponible
  const mNums = existing
    .map(r => r.cuentaId)
    .filter(id => /^M\d+$/i.test(id))
    .map(id => parseInt(id.slice(1), 10));
  let nextNum = mNums.length > 0 ? Math.max(...mNums) + 1 : 100;

  const records = [];
  let newCount = 0;
  let matchedCount = 0;

  for (const row of raw.slice(headerIdx + 1)) {
    // nombreUsuario es la clave de validación — el ID del archivo (si existe) se ignora siempre
    const nombreUsuarioRaw = val(row, 'nombreUsuario');
    if (!nombreUsuarioRaw) continue;

    const nombreUsuario = String(nombreUsuarioRaw).trim();

    // Resolver cuentaId SIEMPRE por nombreUsuario, nunca por el campo del archivo
    const found = byUsername[nombreUsuario.toLowerCase()];
    let cuentaId;
    if (found) {
      cuentaId = found;        // mantener el ID existente en DB
      matchedCount++;
    } else {
      cuentaId = `M${nextNum}`; // cuenta nueva: ID automático
      nextNum++;
      newCount++;
    }

    const contrasena  = val(row, 'contrasena');
    const credito     = val(row, 'credito');
    const fechaInicio = val(row, 'fechaInicio');
    const fechaFin    = val(row, 'fechaFin');
    const smartTv     = val(row, 'smartTv');
    const estado      = val(row, 'estado');

    records.push({
      cuentaId,
      nombreUsuario,
      contrasena:  contrasena  != null ? String(contrasena).trim()        : null,
      credito:     credito     != null ? Number(credito)                  : null,
      fechaInicio: fechaInicio != null ? String(fechaInicio).split(' ')[0] : null,
      fechaFin:    fechaFin    != null ? String(fechaFin).split(' ')[0]    : null,
      smartTv:     smartTv     != null ? String(smartTv).trim()           : null,
      estado:      estado      != null ? String(estado).trim()            : null,
    });
  }

  if (records.length > 0) {
    await CuentaPadre.bulkCreate(records, {
      updateOnDuplicate: ['nombreUsuario', 'contrasena', 'credito', 'fechaInicio', 'fechaFin', 'smartTv', 'estado'],
    });
  }

  const all = await CuentaPadre.findAll({ order: [['cuentaId', 'ASC']] });

  const parts = [`${records.length} cuenta(s) procesada(s)`];
  if (matchedCount > 0) parts.push(`${matchedCount} asociada(s) por usuario`);
  if (newCount > 0)     parts.push(`${newCount} nueva(s) con ID asignado`);

  res.json({ message: parts.join(', '), newCount, matchedCount, rows: all });
}));

router.post('/cuentas-padre/restore', asyncHandler(async (req, res) => {
  const snapshot = req.body;
  if (!Array.isArray(snapshot)) return res.status(400).json({ error: 'Se esperaba un arreglo de registros' });

  const snapshotIds = snapshot.map(r => r.cuentaId);

  // Eliminar filas creadas por la carga que no estaban en el snapshot
  if (snapshotIds.length > 0) {
    await CuentaPadre.destroy({ where: { cuentaId: { [Op.notIn]: snapshotIds } } });
  } else {
    await CuentaPadre.destroy({ where: {} });
  }

  // Restaurar todos los registros del snapshot
  const CUENTA_PADRE_FIELDS = ['cuentaId', 'nombreUsuario', 'contrasena', 'credito', 'fechaInicio', 'fechaFin', 'smartTv', 'estado'];
  if (snapshot.length > 0) {
    const records = snapshot.map(r => {
      const record = {};
      for (const f of CUENTA_PADRE_FIELDS) record[f] = r[f] ?? null;
      return record;
    });
    await CuentaPadre.bulkCreate(records, {
      updateOnDuplicate: CUENTA_PADRE_FIELDS.filter(f => f !== 'cuentaId'),
    });
  }

  const all = await CuentaPadre.findAll({ order: [['cuentaId', 'ASC']] });
  res.json({ message: 'Tabla restaurada al estado anterior', rows: all });
}));

router.post('/cuentas-padre/import', asyncHandler(async (_req, res) => {
  const count = await importCuentasPadre(true);
  const all = await CuentaPadre.findAll({ order: [['cuentaId', 'ASC']] });
  res.json({ message: `${count} cuentas restauradas desde Tabla_Cuentaspadre.xlsx`, rows: all });
}));

router.post('/cuentas-padre', asyncHandler(async (req, res) => {
  const cuenta = await CuentaPadre.create(req.body);
  res.status(201).json(cuenta);
}));

router.put('/cuentas-padre/:cuentaId', asyncHandler(async (req, res) => {
  const cuenta = await CuentaPadre.findByPk(req.params.cuentaId);
  if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });
  await cuenta.update(req.body);
  res.json(cuenta);
}));

router.delete('/cuentas-padre/:cuentaId', asyncHandler(async (req, res) => {
  const cuenta = await CuentaPadre.findByPk(req.params.cuentaId);
  if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });
  await cuenta.destroy();
  res.json({ ok: true });
}));

module.exports = router;
