// Catálogo de motivos de baja (copia del servidor: server/utils/motivosBaja.js).
// Se usa en el formulario de Bajas, en "Dar de baja" del Planificador y en el
// Análisis de Bajas.
export const MOTIVOS_BAJA = [
  { clave: 'economico', nombre: 'Precio o problemas económicos', ayuda: 'Le parece caro o no puede pagar' },
  { clave: 'no_usa', nombre: 'No usa el servicio', ayuda: 'Ya no lo ve o perdió el interés' },
  { clave: 'senal', nombre: 'Fallas de señal o de la aplicación', ayuda: 'Canales caídos, buffering, la app falla' },
  { clave: 'dispositivo', nombre: 'Problemas con el dispositivo', ayuda: 'Fire TV dañado, perdido o incompatible' },
  { clave: 'competencia', nombre: 'Se cambió a otro servicio', ayuda: 'Otro proveedor IPTV o plataformas de streaming' },
  { clave: 'soporte', nombre: 'Insatisfecho con la atención', ayuda: 'Tiempo de respuesta o trato del soporte' },
  { clave: 'moroso', nombre: 'No pagó (moroso)', ayuda: 'Se le cortó por falta de pago' },
  { clave: 'temporal', nombre: 'Pausa temporal (viaje o temporada)', ayuda: 'Piensa volver más adelante' },
  { clave: 'cambio_cuenta', nombre: 'Cambio de cuenta o de pantalla', ayuda: 'Movimiento interno: el cliente sigue activo en otra pantalla' },
  { clave: 'fallecimiento', nombre: 'Fallecimiento del titular', ayuda: '' },
  { clave: 'otro', nombre: 'Otro motivo', ayuda: 'Explícalo en las observaciones' },
]

export const nombresMotivos = MOTIVOS_BAJA.map(m => m.nombre)
