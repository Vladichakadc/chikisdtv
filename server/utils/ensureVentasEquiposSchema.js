// Migración idempotente de esquema para ventas_equipos.
//
// El modelo VentaEquipo ganó columnas después de que la tabla ya existía en
// producción (`costo`, `serial` y luego `garantia`). Delega en el helper
// genérico ensureModelColumns (ver ese archivo para el porqué de este patrón
// frente a `sync({ alter: true })`).

const VentaEquipo = require('../models/VentaEquipo');
const { ensureModelColumns } = require('./ensureModelColumns');

async function ensureVentasEquiposSchema() {
  return ensureModelColumns(VentaEquipo);
}

module.exports = { ensureVentasEquiposSchema };
