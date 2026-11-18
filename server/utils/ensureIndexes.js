// Índices que la app necesita y que sequelize.sync() NO agrega a tablas que
// ya existen (solo los crea con la tabla). CREATE INDEX IF NOT EXISTS es
// idempotente y barato en cada arranque.
const sequelize = require('../config/database');

const INDICES = [
  // Comprobante / último pago: vínculo principal y respaldo por nickname
  'CREATE INDEX IF NOT EXISTS idx_ventas_idPantalla_customerId ON ventas(idPantalla, customerId)',
  'CREATE INDEX IF NOT EXISTS idx_ventas_nickname ON ventas(nickname)',
  // Pantallas de un cliente (comprobante con varias cuentas)
  'CREATE INDEX IF NOT EXISTS idx_planificador_customerId ON planificador(customerId)',
  // Último recordatorio por pantalla
  'CREATE INDEX IF NOT EXISTS idx_recordatorios_idPantalla_createdAt ON recordatorios(idPantalla, createdAt)',
];

async function ensureIndexes() {
  for (const sql of INDICES) {
    try {
      await sequelize.query(sql);
    } catch (e) {
      // Un índice que falla no debe tumbar el arranque: solo afecta rendimiento
      console.warn(`[DB] No se pudo crear índice: ${sql} — ${e.message}`);
    }
  }
}

module.exports = { ensureIndexes };
