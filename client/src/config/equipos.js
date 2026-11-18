// Equipos (SKU → tipo de Fire TV / dispositivo). Fuente única para "Nueva
// Venta" en Pagos y "Registrar renovación" en el Planificador.
export const SKU_TIPO_FIRE = {
  ONN4KCH: 'Watch ONN 4K china',
  ONN4KO:  'Watch ONN 4K Original',
  ONNHDO:  'Watch ONN HD Original',
}

export const TIPOS_FIRE = [
  'FireTV Stick', 'FireTV Stick 4K', 'FireTV Stick 4K Max', 'FireTV Cube', 'FireTV TV',
  'Watch ONN 4K Original', 'Watch ONN 4K China', 'Watch ONN HD Original',
  'Smart TV (Android/Google)', 'Smart TV (Samsung/LG/Roku)', 'PC / Web', 'Celular / Tablet', 'Otro',
]

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// Equipo de un SKU: el fijo conocido o el último registrado en Pagos con ese SKU
export function tipoFireDeSku(sku, tipoFirePorSku = {}) {
  if (!sku) return ''
  return SKU_TIPO_FIRE[sku] || tipoFirePorSku[sku] || ''
}
