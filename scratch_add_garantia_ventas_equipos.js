// Migración puntual: agrega a `ventas_equipos` las columnas que el modelo
// VentaEquipo define pero que falten en la base de datos (costo, serial,
// garantia — columnas añadidas al modelo después de crear la tabla).
//
// Es idempotente: si no falta nada, no toca la base. El servidor corre esta
// misma migración automáticamente en cada arranque (ver server/server.js →
// ensureVentasEquiposSchema); este script existe para ejecutarla a mano sobre
// una base específica sin levantar el servidor:
//
//   node scratch_add_garantia_ventas_equipos.js
//   DATABASE_PATH="C:\ruta\otra.sqlite" node scratch_add_garantia_ventas_equipos.js

const { ensureVentasEquiposSchema } = require('./server/utils/ensureVentasEquiposSchema');
const sequelize = require('./server/config/database');

(async () => {
  try {
    const agregadas = await ensureVentasEquiposSchema();
    if (agregadas.length === 0) {
      console.log('[OK] ventas_equipos ya tiene todas las columnas del modelo — nada que migrar.');
    } else {
      console.log(`[OK] Migración aplicada. Columnas agregadas: ${agregadas.join(', ')}`);
    }
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('[ERROR] La migración falló:', err.message);
    process.exit(1);
  }
})();
