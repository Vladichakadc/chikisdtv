// Vínculo Planificador ↔ Pagos (utils/ultimosPagos.js) contra una BD SQLite
// temporal: idPantalla+customerId como vínculo principal, nickname de
// respaldo, la venta más reciente gana y sin doble conteo entre pantallas.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'chikis-test-')), 'test.sqlite');
process.env.DATABASE_PATH = dbFile;

const sequelize = require('../config/database');
const { Venta } = require('../models');
const { buscarUltimosPagos } = require('../utils/ultimosPagos');

const venta = (idVM, campos) => ({ idVM, precioVenta: 10000, tipoPlan: 'Plan Mensual', ...campos });

before(async () => {
  await sequelize.sync();
  await Venta.bulkCreate([
    // M001-2 (cliente 100): pago viejo por pantalla
    venta('V1', { idPantalla: 'M001-2', customerId: '100', nickname: 'Jodman España', fecha: '2025-10-07' }),
    // Pago más reciente con el mismo nickname pero registrado en M001-3 (otra pantalla del cliente)
    venta('V2', { idPantalla: 'M001-3', customerId: '100', nickname: 'Jodman España', fecha: '2026-05-01' }),
    // Pantalla reasignada: venta del titular ANTERIOR (otro customerId) en el mismo slot
    venta('V3', { idPantalla: 'M032-3', customerId: '999', nickname: 'Javier rengifo', fecha: '2026-06-01' }),
    venta('V4', { idPantalla: 'M032-3', customerId: '200', nickname: 'Carlos Trochez 1', fecha: '2026-03-01' }),
    // Nickname renombrado: la venta trae el nombre viejo, pero el slot y el cliente coinciden
    venta('V5', { idPantalla: 'M050-1', customerId: '300', nickname: 'Xiomy viejo', fecha: '2026-09-10' }),
    // Venta histórica sin idPantalla, solo nickname
    venta('V6', { idPantalla: null, customerId: null, nickname: 'Solo Nick', fecha: '2026-02-02' }),
  ]);
});

after(async () => { await sequelize.close(); fs.rmSync(path.dirname(dbFile), { recursive: true, force: true }); });

test('no reutiliza por nickname una venta atada a otra pantalla del cliente', async () => {
  const r = await buscarUltimosPagos([
    { idPantalla: 'M001-2', customerId: '100', nickname: 'Jodman España' },
    { idPantalla: 'M001-3', customerId: '100', nickname: 'Jodman España 2' },
  ]);
  assert.equal(r.get('M001-2').idVM, 'V1');
  assert.equal(r.get('M001-2').vinculo, 'pantalla');
  assert.equal(r.get('M001-3').idVM, 'V2');
});

test('en un slot reasignado no toma la venta del titular anterior', async () => {
  const r = await buscarUltimosPagos([{ idPantalla: 'M032-3', customerId: '200', nickname: 'Carlos Trochez 1' }]);
  assert.equal(r.get('M032-3').idVM, 'V4');
});

test('renombrar el nickname no pierde el último pago', async () => {
  const r = await buscarUltimosPagos([{ idPantalla: 'M050-1', customerId: '300', nickname: 'Xiomy nuevo' }]);
  assert.equal(r.get('M050-1').idVM, 'V5');
  assert.equal(r.get('M050-1').vinculo, 'pantalla');
});

test('respaldo por nickname para ventas históricas sin idPantalla', async () => {
  const r = await buscarUltimosPagos([{ idPantalla: 'M060-1', customerId: '400', nickname: 'Solo Nick' }]);
  assert.equal(r.get('M060-1').idVM, 'V6');
  assert.equal(r.get('M060-1').vinculo, 'nickname');
});

test('sin coincidencias devuelve null y acepta lista vacía', async () => {
  const r = await buscarUltimosPagos([{ idPantalla: 'M999-1', customerId: '1', nickname: 'Nadie' }]);
  assert.equal(r.get('M999-1'), null);
  assert.equal((await buscarUltimosPagos([])).size, 0);
});
