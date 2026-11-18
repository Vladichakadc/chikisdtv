// Reglas canónicas de estado de una pantalla del Planificador (servidor).
// La UI tiene su espejo en client/src/pages/admin/planificador/rowHelpers.js;
// la prueba client/src/pages/admin/planificador/reglas.consistencia.test.js
// verifica que ambas den el mismo resultado — si cambias una, cambia la otra.
//
// El campo `alertaReal` almacenado proviene del import de Excel y queda
// obsoleto cuando el cliente renueva: nunca es fuente de verdad. La cortesía
// es un dato propio (columna booleana `cortesia`).

// Días antes del fin de plan en que una pantalla pasa a "próxima a vencer".
// Única fuente: la API lo devuelve como `diasAlerta` y la UI lo usa.
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

// Acepta el booleano `cortesia` o, por compatibilidad, el texto legado "CORTESIA"
function esCortesia(valor) {
  if (valor === true || valor === 1) return true;
  return String(valor || '').trim().toUpperCase() === 'CORTESIA';
}

function estadoFromDias(dias, diasAlerta = DIAS_ALERTA) {
  if (dias == null) return '';
  if (dias <= 0) return 'VENCIDO';
  if (dias <= diasAlerta) return 'ALERTA';
  return 'VIGENTE';
}

function alertaFromDias(dias, cortesia, diasAlerta = DIAS_ALERTA) {
  if (esCortesia(cortesia)) return 'CORTESIA';
  if (dias == null) return '';
  if (dias <= 0) return 'VENCIDO';
  if (dias <= diasAlerta) return 'PROXIMO A VENCER';
  return '';
}

// Variante de fila: libre / vencido / cortesia / alerta / vigente
function varianteDe(p, diasAlerta = DIAS_ALERTA) {
  const nombre = (String(p.nombre ?? '') + String(p.apellido ?? '')).trim();
  const nickname = String(p.nickname || '').trim();
  if (nickname.toLowerCase().includes('libre')) return 'libre';
  if (!nombre && !nickname) return 'libre';
  const dias = calcDias(p.duracionReal || p.finalizacion) ?? p.diasVencimientoReal ?? p.diasVencimiento ?? null;
  if (dias != null && dias <= 0) return 'vencido';
  if (esCortesia(p.cortesia) || esCortesia(p.alertaReal)) return 'cortesia';
  if (dias != null && dias <= diasAlerta) return 'alerta';
  return 'vigente';
}

module.exports = { DIAS_ALERTA, parseFechaLocal, calcDias, esCortesia, estadoFromDias, alertaFromDias, varianteDe };
