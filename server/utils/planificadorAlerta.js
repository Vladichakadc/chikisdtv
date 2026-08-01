// Cálculo canónico de la alerta de una pantalla del Planificador a partir de
// su fecha de fin real (`duracionReal`). El campo `alertaReal` almacenado en
// la BD proviene del import de Excel y queda obsoleto cuando el cliente
// renueva (la fecha se actualiza pero el texto no): nunca debe usarse como
// fuente de verdad. Solo se respeta el marcador manual "CORTESIA".
// Misma lógica que la UI del Planificador (client/src/pages/admin/planificador/rowHelpers.js).

const DIAS_ALERTA = 8;

// Parsea una fecha DATEONLY ("YYYY-MM-DD") como medianoche LOCAL (America/Bogota,
// fijada en server.js). new Date('YYYY-MM-DD') interpreta medianoche UTC, que en
// Bogotá (UTC-5) cae en el día anterior y hacía ver los vencimientos adelantados 1 día.
function parseFechaLocal(fecha) {
  const m = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(fecha);
  return isNaN(d.getTime()) ? null : d;
}

function calcDias(fecha) {
  if (!fecha) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = parseFechaLocal(fecha); if (!d) return null;
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function alertaFromDias(dias, stored) {
  if ((stored || '').trim().toUpperCase() === 'CORTESIA') return 'CORTESIA';
  if (dias == null) return '';
  if (dias <= 0) return 'VENCIDO';
  if (dias <= DIAS_ALERTA) return 'PROXIMO A VENCER';
  return '';
}

module.exports = { DIAS_ALERTA, calcDias, alertaFromDias };
