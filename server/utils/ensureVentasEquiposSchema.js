// Migración idempotente de esquema para ventas_equipos.
//
// El modelo VentaEquipo ganó columnas después de que la tabla ya existía en
// producción (`costo`, `serial` y luego `garantia`). `sequelize.sync()` sin
// `alter` NO agrega columnas a tablas existentes, así que cualquier base de
// datos creada antes del cambio revienta con "no such column: garantia" en el
// primer SELECT del modelo (p. ej. seedDevicesFromVentas en server.js).
//
// Este helper compara los atributos del modelo contra PRAGMA table_info y
// ejecuta un ALTER TABLE ... ADD COLUMN por cada columna faltante. Es seguro
// correrlo en cada arranque: si no falta nada, no hace nada. Se prefiere sobre
// `sync({ alter: true })` porque en SQLite ese camino reconstruye la tabla
// completa (copia + drop + rename), innecesario y riesgoso con datos reales.

const sequelize = require('../config/database');
const VentaEquipo = require('../models/VentaEquipo');
const { DataTypes } = require('sequelize');

// Mapa Sequelize DataTypes → tipo de columna SQLite (afinidad)
function getSQLiteType(dataType) {
  if (!dataType) return 'TEXT';
  
  const typeKey = dataType.key || dataType.constructor.name;
  
  const tipoMap = {
    'STRING': 'VARCHAR(255)',
    'VARCHAR': 'VARCHAR(255)',
    'TEXT': 'TEXT',
    'FLOAT': 'FLOAT',
    'DOUBLE': 'FLOAT',
    'INTEGER': 'INTEGER',
    'INT': 'INTEGER',
    'BOOLEAN': 'TINYINT(1)',
    'DATEONLY': 'DATE',
    'DATE': 'DATETIME',
  };
  
  return tipoMap[typeKey] || 'TEXT';
}

async function ensureVentasEquiposSchema() {
  const cols = await sequelize.query('PRAGMA table_info(`ventas_equipos`)', { type: 'SELECT' });
  if (cols.length === 0) return []; // la tabla aún no existe: sync() la creará completa

  const existentes = new Set(cols.map(c => c.name.toLowerCase()));
  const agregadas = [];

  for (const [nombre, attr] of Object.entries(VentaEquipo.rawAttributes)) {
    const columna = attr.field || nombre;
    if (existentes.has(columna.toLowerCase())) continue;
    
    const tipo = getSQLiteType(attr.type);
    try {
      await sequelize.query(`ALTER TABLE \`ventas_equipos\` ADD COLUMN \`${columna}\` ${tipo}`);
      agregadas.push(columna);
    } catch (err) {
      console.warn(`[MIGRACION] No se pudo agregar columna ${columna}:`, err.message);
    }
  }

  if (agregadas.length > 0) {
    console.log(`[MIGRACION] ventas_equipos: columna(s) agregada(s): ${agregadas.join(', ')}`);
  }
  return agregadas;
}

module.exports = { ensureVentasEquiposSchema };

