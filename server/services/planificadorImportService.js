const path = require('path');
const XLSX = require('xlsx');
const sequelize = require('../config/database');
const { Planificador, CuentaPadre } = require('../models');

function excelToDate(n) {
  if (n === '' || n == null) return null;
  const d = new Date(Date.UTC(1899, 11, 30) + Number(n) * 86400000);
  return d.toISOString().split('T')[0];
}

// Corrige automáticamente filas donde prefix(idPantalla) !== cuentaId.
// Para cada fila afectada busca la CuentaPadre cuyo cuentaId == prefix(idPantalla)
// y actualiza cuentaId + bloque CUENTA (cuenta/password/credito/inicio/finalizacion).
// Si no existe CuentaPadre para el prefix esperado, la fila queda intacta y se
// incluye en `unfixable` (requiere revisión manual).
// Devuelve { fixed, unfixable } y loguea correcciones al arranque/import.
async function autoFixCuentaIdMismatches() {
  const rows = await Planificador.findAll({ raw: true });
  const mismatched = rows.filter(r => {
    const prefix = (r.idPantalla || '').split('-')[0];
    return prefix && r.cuentaId && prefix !== r.cuentaId;
  });
  if (mismatched.length === 0) return { fixed: 0, unfixable: [] };

  const cuentas = await CuentaPadre.findAll();
  const cuentaMap = {};
  cuentas.forEach(c => { cuentaMap[c.cuentaId] = c; });

  let fixed = 0;
  const unfixable = [];

  for (const row of mismatched) {
    const prefix = row.idPantalla.split('-')[0];
    const cp = cuentaMap[prefix];
    if (!cp) { unfixable.push({ idPantalla: row.idPantalla, cuentaIdActual: row.cuentaId, cuentaIdEsperado: prefix }); continue; }

    await Planificador.update(
      {
        cuentaId:     cp.cuentaId,
        cuenta:       cp.nombreUsuario || null,
        password:     cp.contrasena    || null,
        credito:      cp.credito       ?? null,
        inicio:       cp.fechaInicio   || null,
        finalizacion: cp.fechaFin      || null,
      },
      { where: { idPantalla: row.idPantalla } }
    );
    console.log(`[AUTOFIX] ${row.idPantalla}: cuentaId ${row.cuentaId} → ${prefix}`);
    fixed++;
  }

  if (fixed > 0) console.log(`[AUTOFIX] ${fixed} pantalla(s) autocorregida(s). ${unfixable.length} sin CuentaPadre (requieren revisión).`);
  return { fixed, unfixable };
}

// Normaliza duracionPlan a meses enteros. El Excel de origen la calcula como
// días/30 (p. ej. 212/30 = 7,0667) y esos decimales se colaron a la BD en
// imports antiguos. Idempotente: solo toca filas con decimales.
async function normalizeDuracionPlan() {
  const [, meta] = await sequelize.query(
    "UPDATE planificador SET duracionPlan = ROUND(duracionPlan) WHERE duracionPlan IS NOT NULL AND duracionPlan <> ROUND(duracionPlan)"
  );
  const changed = meta?.changes ?? 0;
  if (changed > 0) console.log(`[AUTOFIX] duracionPlan redondeada a meses enteros en ${changed} pantalla(s).`);
  return changed;
}

// Cada cuenta padre soporta 3 pantallas (ver CostoPantallaPage: "cada crédito
// habilita una cuenta que suele soportar 3 pantallas").
const PANTALLAS_POR_CUENTA = 3;

// Crea pantallas libres (`${cuentaId}-1..3`) para cada CuentaPadre que aún no
// tiene filas en el Planificador — sin esto, una cuenta cargada en Cuentas
// Padre después del import de Excel nunca aparece (el sync solo hace UPDATE).
// Devuelve los cuentaId creados.
async function ensurePantallasCuentasPadre() {
  const [cuentas, existentes] = await Promise.all([
    CuentaPadre.findAll({ raw: true }),
    Planificador.findAll({ attributes: ['cuentaId'], group: ['cuentaId'], raw: true }),
  ]);
  const conPantallas = new Set(existentes.map(r => String(r.cuentaId).trim()));
  const faltantes = cuentas.filter(cp => !conPantallas.has(String(cp.cuentaId).trim()));
  if (faltantes.length === 0) return [];

  const records = faltantes.flatMap(cp => {
    const cuentaId = String(cp.cuentaId).trim();
    return Array.from({ length: PANTALLAS_POR_CUENTA }, (_, i) => ({
      idPantalla:   `${cuentaId}-${i + 1}`,
      cuentaId,
      cuenta:       cp.nombreUsuario || null,
      password:     cp.contrasena    || null,
      credito:      cp.credito       ?? null,
      inicio:       cp.fechaInicio   || null,
      finalizacion: cp.fechaFin      || null,
      nickname:     'Libre',
      pantallas:    1,
    }));
  });
  // ignoreDuplicates: si un idPantalla ya existe bajo otro cuentaId no se pisa
  await Planificador.bulkCreate(records, { ignoreDuplicates: true });
  const ids = faltantes.map(cp => String(cp.cuentaId).trim());
  console.log(`[PLANIFICADOR] Pantallas libres creadas para cuenta(s) padre nuevas: ${ids.join(', ')}`);
  return ids;
}

// Importa/sincroniza el Planificador desde el archivo .xlsm de origen.
// Compartido entre el router del Planificador y el de Bajas (que lo usa para
// auto-poblar nicknames cuando la tabla está vacía).
// Aplica autofix de cuentaId inmediatamente después del import.
async function importFromExcel() {
  const filePath = path.join(__dirname, '..', '..', 'Planificador de proyectos Magistv_v1_202602105.xlsm');
  const wb = XLSX.readFile(filePath, { raw: true });
  const ws = wb.Sheets['Planificador'];
  if (!ws) throw new Error('Hoja Planificador no encontrada en el archivo Excel');
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const records = [];
  for (let i = 4; i < data.length; i++) {
    const r = data[i];
    if (!r?.[0]) continue;
    const cuentaId   = String(r[0]).trim();  if (!cuentaId)   continue;
    const idPantalla = String(r[13] || '').trim(); if (!idPantalla) continue;
    records.push({
      idPantalla,
      cuentaId,
      cuenta:       String(r[1]  || '').trim(),
      password:     String(r[2]  || '').trim(),
      credito:      r[3]  !== '' ? Number(r[3])  : null,
      inicio:       excelToDate(r[4]),
      finalizacion: r[5]  ? String(r[5]).split(' ')[0] : null,
      nombre:       String(r[10] || '').trim(),
      apellido:     String(r[11] || '').trim(),
      customerId:   String(r[14] || '').trim(),
      nickname:     String(r[15] || '').trim(),
      pantallas:    r[16] !== '' ? Number(r[16]) : 1,
      // El Excel guarda la duración como días/30 (7,0667…) — se redondea a meses enteros
      duracionPlan: r[17] !== '' ? Math.round(Number(r[17])) : null,
      inicioReal:   excelToDate(r[18]),
      duracionReal: excelToDate(r[19]),
      alertaReal:   String(r[23] || '').trim(),
      porcentaje:   r[24] !== '' ? Number(r[24]) : null,
    });
  }
  if (records.length > 0) {
    await Planificador.bulkCreate(records, {
      updateOnDuplicate: [
        'cuentaId', 'cuenta', 'password', 'credito', 'inicio', 'finalizacion',
        'nombre', 'apellido', 'customerId', 'nickname', 'pantallas', 'duracionPlan',
        'inicioReal', 'duracionReal', 'alertaReal', 'porcentaje',
      ],
    });
  }

  // Autocorrección inmediata: si el Excel tiene el bug de cuentaId corrido,
  // lo sanamos en la BD antes de que cualquier cliente lea los datos.
  await autoFixCuentaIdMismatches();
  await normalizeDuracionPlan();

  return records.length;
}

module.exports = { importFromExcel, autoFixCuentaIdMismatches, normalizeDuracionPlan, ensurePantallasCuentasPadre, excelToDate };
