// Catálogo de motivos de baja. Una sola lista para el formulario de Bajas, la
// baja desde el Planificador y el Análisis de Bajas (copia en el cliente:
// client/src/config/motivosBaja.js — mantener ambas iguales; hay una prueba).
//
// Cada motivo guardado se clasifica en una CATEGORÍA para poder analizarlo,
// también los textos libres o antiguos ("Precio elevado", "Problemas de señal"…).
const MOTIVOS_BAJA = [
  { clave: 'economico', nombre: 'Precio o problemas económicos', palabras: ['precio', 'econom', 'caro', 'dinero', 'pagar', 'plata', 'costoso'] },
  { clave: 'no_usa', nombre: 'No usa el servicio', palabras: ['no usa', 'no lo usa', 'poco interes', 'poco interés', 'no ve', 'no utiliza', 'no le interesa'] },
  { clave: 'senal', nombre: 'Fallas de señal o de la aplicación', palabras: ['señal', 'senal', 'buffer', 'caid', 'calidad', 'canales', 'app', 'aplicacion', 'aplicación', 'compatib', 'internet'] },
  { clave: 'dispositivo', nombre: 'Problemas con el dispositivo', palabras: ['dispositivo', 'fire', 'equipo', 'dañad', 'danad', 'perdid', 'control'] },
  { clave: 'competencia', nombre: 'Se cambió a otro servicio', palabras: ['proveedor', 'competencia', 'otro servicio', 'netflix', 'streaming', 'legal', 'cambio de servicio'] },
  { clave: 'soporte', nombre: 'Insatisfecho con la atención', palabras: ['soporte', 'atencion', 'atención', 'insatisf', 'servicio al cliente'] },
  { clave: 'moroso', nombre: 'No pagó (moroso)', palabras: ['moroso', 'no paga', 'no pago', 'no pagó', 'deuda', 'mora'] },
  { clave: 'temporal', nombre: 'Pausa temporal (viaje o temporada)', palabras: ['temporal', 'viaje', 'mudanza', 'residencia', 'vuelve', 'regresa', 'temporada'] },
  { clave: 'cambio_cuenta', nombre: 'Cambio de cuenta o de pantalla', palabras: ['cambio de cuenta', 'cambio de pantalla', 'traslado', 'reasign', 'cambio de nickname', 'cambio de plan'] },
  { clave: 'fallecimiento', nombre: 'Fallecimiento del titular', palabras: ['fallec', 'murio', 'murió'] },
  { clave: 'otro', nombre: 'Otro motivo', palabras: [] },
];
const SIN_MOTIVO = { clave: 'sin_motivo', nombre: 'Sin motivo registrado' };

const normalizar = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// Texto guardado → categoría del catálogo
function categoriaMotivo(texto) {
  const t = normalizar(texto);
  if (!t) return SIN_MOTIVO;
  const exacto = MOTIVOS_BAJA.find(m => normalizar(m.nombre) === t);
  if (exacto) return exacto;
  for (const m of MOTIVOS_BAJA) {
    if (m.palabras.some(p => t.includes(normalizar(p)))) return m;
  }
  return MOTIVOS_BAJA.find(m => m.clave === 'otro');
}

module.exports = { MOTIVOS_BAJA, SIN_MOTIVO, categoriaMotivo, normalizar };
