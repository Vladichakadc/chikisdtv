// scratch_reimport_ventas_firetv.js
// Backfill puntual de ventas_equipos desde Tablas/1-orders_table_Ventas_Firetv2024.xlsx.
// Pasos: (1) backup de database.sqlite, (2) agrega la columna `garantia` a ventas_equipos
// si falta (ya cubierto también por ensureVentasEquiposSchema en cada arranque del server),
// (3) llama a importVentasEquipos() de routes/admin/ventasEquipos — la BD es la fuente de
// verdad: esa función solo AGREGA los idVM del Excel que aún no existan, nunca borra ni
// sobreescribe registros existentes. Uso: node scratch_reimport_ventas_firetv.js
const fs = require('fs');
const path = require('path');
const sequelize = require('./server/config/database');
const { VentaEquipo } = require('./server/models');
const { importVentasEquipos } = require('./server/routes/admin/ventasEquipos');

(async () => {
  try {
    // 1. Backup
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');
    const backupDir = process.env.BACKUP_DIR || path.join(__dirname, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = path.join(backupDir, `database_pre_reimport_ventas_${stamp}.sqlite`);
    fs.copyFileSync(dbPath, backupPath);
    console.log(`[BACKUP] ${backupPath}`);

    // 2. Migración de columna
    const [cols] = await sequelize.query('PRAGMA table_info(ventas_equipos)');
    if (!cols.some(c => c.name === 'garantia')) {
      await sequelize.query('ALTER TABLE ventas_equipos ADD COLUMN garantia TEXT');
      console.log('[MIGRATE] Columna garantia agregada a ventas_equipos');
    } else {
      console.log('[MIGRATE] Columna garantia ya existe');
    }

    // 3. Reimportación total
    const before = await VentaEquipo.count();
    const imported = await importVentasEquipos();
    const after = await VentaEquipo.count();
    console.log(`[IMPORT] Registros antes: ${before} | importados: ${imported} | ahora: ${after}`);

    // 4. Resumen de verificación
    const [garantias] = await sequelize.query(
      "SELECT COALESCE(garantia, '(null)') g, COUNT(*) n FROM ventas_equipos GROUP BY garantia"
    );
    console.log('[CHECK] Garantía:', garantias.map(r => `${r.g}=${r.n}`).join(' · '));
    const [[{ conNombre }]] = await sequelize.query(
      'SELECT COUNT(*) conNombre FROM ventas_equipos WHERE nombre IS NOT NULL'
    );
    console.log(`[CHECK] Con nombre enriquecido desde tabla_clientes: ${conNombre}/${after}`);
    const muestra = await VentaEquipo.findAll({ limit: 3, order: [['fecha', 'DESC']], raw: true });
    for (const m of muestra) {
      console.log(`[CHECK] ${m.idVM} | cliente ${m.customerId} ${m.nombre || ''} ${m.apellido || ''} | ${m.tipoFire} | ${m.fecha} | $${m.precioVenta} | serial ${m.serial} | garantía ${m.garantia}`);
    }
    process.exit(0);
  } catch (e) {
    console.error('[ERROR]', e);
    process.exit(1);
  }
})();
