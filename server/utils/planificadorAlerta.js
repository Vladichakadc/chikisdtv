// Cálculo canónico de la alerta de una pantalla del Planificador a partir de
// su fecha de fin real (`duracionReal`). El campo `alertaReal` almacenado en
// la BD proviene del import de Excel y queda obsoleto cuando el cliente
// renueva (la fecha se actualiza pero el texto no): nunca debe usarse como
// fuente de verdad. Solo se respeta el marcador manual "CORTESIA".
// Misma lógica que la UI del Planificador (client/src/pages/admin/planificador/rowHelpers.js).

const DIAS_ALERTA = 8;

function calcDias(fecha) {
  if (!fecha) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(fecha); if (isNaN(d.getTime())) return null;
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
