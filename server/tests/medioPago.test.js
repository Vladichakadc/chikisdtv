// El banco Nu se guarda siempre como "NU": normalización al guardar y
// migración de los registros existentes ("Nu", "UN").
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'chikis-medio-')), 'test.sqlite');
process.env.DATABASE_PATH = dbFile;
const sequelize = require('../config/database');
const { Venta } = require('../models');
const { normalizarMedioPago, unificarMediosPago } = require('../utils/medioPago');

before(async () => { await sequelize.sync(); });
after(async () => { await sequelize.close(); fs.rmSync(path.dirname(dbFile), { recursive: true, force: true }); });

test('normalizarMedioPago', () => {
  for (const v of ['NU', 'Nu', 'nu', 'UN', ' un ', 'Nu Bank', 'NUBANK']) assert.equal(normalizarMedioPago(v), 'NU');
  assert.equal(normalizarMedioPago('Nequi'), 'Nequi');
  assert.equal(normalizarMedioPago('  '), null);
  assert.equal(normalizarMedioPago(null), null);
});

test('al guardar una venta "UN" queda "NU"', async () => {
  const v = await Venta.create({ idVM: 'VMT1', medioPago: 'UN', precioVenta: 1000 });
  assert.equal(v.medioPago, 'NU');
});

test('unificarMediosPago corrige los registros existentes y es idempotente', async () => {
  await sequelize.query("INSERT INTO ventas (idVM, medioPago, createdAt, updatedAt) VALUES ('VMT2','Nu',datetime('now'),datetime('now')), ('VMT3','UN',datetime('now'),datetime('now')), ('VMT4','Nequi',datetime('now'),datetime('now'))");
  assert.equal(await unificarMediosPago(sequelize), 2);
  assert.equal(await unificarMediosPago(sequelize), 0);
  const [filas] = await sequelize.query("SELECT medioPago, COUNT(*) n FROM ventas GROUP BY medioPago ORDER BY medioPago");
  assert.deepEqual(filas.map(f => [f.medioPago, f.n]), [['NU', 3], ['Nequi', 1]]);
});
