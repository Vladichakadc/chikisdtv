// Devuelve la fecha de hoy en YYYY-MM-DD usando la zona horaria del navegador.
// NO usar toISOString() — siempre retorna UTC, lo que causa desfase de 5h en Bogotá.
export function todayStr() {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}
