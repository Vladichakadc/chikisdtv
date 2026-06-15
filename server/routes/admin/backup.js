const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sequelize = require('../../config/database');
const asyncHandler = require('../../middleware/asyncHandler');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../../database.sqlite');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

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

// Restaura la base de datos local a partir de un archivo .sqlite subido
// (ej. un respaldo descargado de producción). Solo disponible fuera de
// producción: reemplaza database.sqlite y reinicia el proceso para que
// nodemon lo levante de nuevo con los datos nuevos.
router.post('/backup/restore', upload.single('file'), asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Esta operación no está disponible en producción' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' });
  }

  if (req.file.buffer.slice(0, 16).toString('utf8') !== 'SQLite format 3\0') {
    return res.status(400).json({ error: 'El archivo no es una base de datos SQLite válida' });
  }

  await sequelize.close();

  if (fs.existsSync(dbPath)) {
    const fecha = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(dbPath, `${dbPath}.bak_${fecha}`);
  }

  fs.writeFileSync(dbPath, req.file.buffer);
  for (const suffix of ['-wal', '-shm']) {
    const sidecar = `${dbPath}${suffix}`;
    if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
  }

  res.json({ success: true, message: 'Base de datos restaurada. El servidor se reiniciará...' });
  setTimeout(() => process.exit(0), 200);
}));

module.exports = router;
