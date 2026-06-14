const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const sequelize = require('../../config/database');
const asyncHandler = require('../../middleware/asyncHandler');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../../database.sqlite');

// Descarga una copia del archivo SQLite actual (local o de producción, según
// donde corra el servidor). El checkpoint consolida el WAL en el archivo
// principal para que la copia descargada quede completa y consistente.
router.get('/backup/database', asyncHandler(async (req, res) => {
  await sequelize.query('PRAGMA wal_checkpoint(TRUNCATE)');

  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ error: 'No se encontró el archivo de base de datos' });
  }

  const fecha = new Date().toISOString().slice(0, 10);
  res.download(dbPath, `chikisdtv-backup-${fecha}.sqlite`);
}));

module.exports = router;
