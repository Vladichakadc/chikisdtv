const path = require('path');
const XLSX = require('xlsx');
const { Planificador } = require('../models');

function excelToDate(n) {
  if (n === '' || n == null) return null;
  const d = new Date(Date.UTC(1899, 11, 30) + Number(n) * 86400000);
  return d.toISOString().split('T')[0];
}

// Importa/sincroniza el Planificador desde el archivo .xlsm de origen.
// Compartido entre el router del Planificador y el de Bajas (que lo usa para
// auto-poblar nicknames cuando la tabla está vacía).
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
      duracionPlan: r[17] !== '' ? Number(r[17]) : null,
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
  return records.length;
}

module.exports = { importFromExcel, excelToDate };
