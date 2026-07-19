// Migración idempotente de columnas para cualquier modelo Sequelize sobre SQLite.
//
// `sequelize.sync()` sin `alter` NO agrega columnas a tablas existentes, y
// `sync({ alter: true })` en SQLite reconstruye la tabla completa vía una tabla
// temporal `<tabla>_backup` (crear → copiar → drop → renombrar). Si el proceso
// muere a mitad de ese baile (Railway envía SIGTERM en cada redeploy), la tabla
// `_backup` queda huérfana con el esquema viejo y, como Sequelize la crea con
// CREATE TABLE IF NOT EXISTS, el siguiente arranque intenta insertarle más
// columnas de las que tiene y revienta con SQLITE_ERROR ("N columns but M
// values"). Este helper evita ese camino por completo: compara los atributos
// del modelo contra PRAGMA table_info y ejecuta un ALTER TABLE ... ADD COLUMN
// solo por cada columna faltante. Correrlo en cada arranque es seguro.

const sequelize = require('../config/database');

// Mapa mínimo Sequelize → tipo de columna SQLite (afinidad)
const TIPO_SQLITE = {
  STRING: 'VARCHAR(255)',
  TEXT: 'TEXT',
  FLOAT: 'FLOAT',
  INTEGER: 'INTEGER',
  BOOLEAN: 'TINYINT(1)',
  DATEONLY: 'DATE',
  DATE: 'DATETIME',
  ENUM: 'VARCHAR(255)',
};

async function ensureModelColumns(model) {
  const tabla = model.getTableName();
  const cols = await sequelize.query(`PRAGMA table_info(\`${tabla}\`)`, { type: 'SELECT' });
  if (cols.length === 0) return []; // la tabla aún no existe: sync() la creará completa

  const existentes = new Set(cols.map(c => c.name.toLowerCase()));
  const agregadas = [];

  for (const [nombre, attr] of Object.entries(model.rawAttributes)) {
    const columna = attr.field || nombre;
    if (existentes.has(columna.toLowerCase())) continue;
    const tipo = TIPO_SQLITE[attr.type.key] || 'TEXT';
    await sequelize.query(`ALTER TABLE \`${tabla}\` ADD COLUMN \`${columna}\` ${tipo}`);
    agregadas.push(columna);
  }

  if (agregadas.length > 0) {
    console.log(`[MIGRACION] ${tabla}: columna(s) agregada(s): ${agregadas.join(', ')}`);
  }
  return agregadas;
}

// Elimina tablas `<tabla>_backup` huérfanas dejadas por un sync({ alter })
// interrumpido. La tabla original queda intacta (el crash ocurre antes del
// DROP de la original o después de recrearla), así que borrar la backup es
// seguro y desbloquea el arranque.
async function dropStaleBackupTables(...tablas) {
  for (const tabla of tablas) {
    const backup = `${tabla}_backup`;
    const existe = await sequelize.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      { type: 'SELECT', replacements: [backup] }
    );
    if (existe.length > 0) {
      await sequelize.query(`DROP TABLE \`${backup}\``);
      console.log(`[MIGRACION] Tabla huérfana eliminada: ${backup}`);
    }
  }
}

module.exports = { ensureModelColumns, dropStaleBackupTables };
