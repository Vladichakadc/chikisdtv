// Aviso de cambio de credenciales: agrupa los nicknames de la cuenta por
// cliente e informa los de otras cuentas padre.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'chikis-aviso-')), 'test.sqlite');
process.env.DATABASE_PATH = dbFile;

const sequelize = require('../config/database');
const { Planificador, CuentaPadre, TablaCliente } = require('../models');
const { datosAvisoCredenciales } = require('../services/avisoCredenciales');

before(async () => {
  await sequelize.sync();
  await CuentaPadre.bulkCreate([
    { cuentaId: 'M084', nombreUsuario: 'clitedur2024', contrasena: '249602' },
    { cuentaId: 'M090', nombreUsuario: 'otra', contrasena: 'x' },
  ]);
  await Planificador.bulkCreate([
    { idPantalla: 'M084-1', cuentaId: 'M084', nombre: 'Catalina', apellido: 'Gomez', customerId: '10', nickname: 'Catalina Gomez' },
    { idPantalla: 'M084-2', cuentaId: 'M084', nombre: 'Andrea', apellido: 'Maestre', customerId: '20', nickname: 'Andrea Maestre 1' },
    { idPantalla: 'M084-3', cuentaId: 'M084', nombre: 'Andrea', apellido: 'Maestre', customerId: '20', nickname: 'Andrea Maestre 2' },
    { idPantalla: 'M090-1', cuentaId: 'M090', nombre: 'Andrea', customerId: '20', nickname: 'Andrea Maestre 3' },
    { idPantalla: 'M090-2', cuentaId: 'M090', nickname: 'Libre' },
  ]);
  await TablaCliente.create({ customerId: '20', nombre: 'Andrea', movil: '3001234567', pais: 'Colombia' });
});

after(async () => { await sequelize.close(); fs.rmSync(path.dirname(dbFile), { recursive: true, force: true }); });

test('un mensaje por cliente con todos sus nicknames de la cuenta', async () => {
  const d = await datosAvisoCredenciales('M084');
  assert.equal(d.usuario, 'clitedur2024');
  assert.equal(d.contrasena, '249602');
  assert.equal(d.clientes.length, 2);
  const andrea = d.clientes.find(c => c.customerId === '20');
  assert.deepEqual(andrea.pantallas.map(p => p.nickname), ['Andrea Maestre 1', 'Andrea Maestre 2']);
  assert.deepEqual(andrea.otrasCuentas, ['Andrea Maestre 3']);
  assert.equal(andrea.telefono, '3001234567');
  assert.deepEqual(d.idPantallas, ['M084-1', 'M084-2', 'M084-3']);
});

test('omite pantallas libres y cuentas inexistentes', async () => {
  assert.equal((await datosAvisoCredenciales('M090')).clientes.length, 1);
  assert.equal(await datosAvisoCredenciales('NOPE'), null);
});
