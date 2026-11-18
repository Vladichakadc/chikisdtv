// Pruebas HTTP del router del Planificador contra una BD SQLite temporal:
// Cuentas Padre como única fuente, contraseñas cifradas y bajo demanda,
// renovación, historial y deshacer.
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.TZ = 'America/Bogota';
process.env.CREDENCIALES_KEY = 'clave-pruebas-rutas';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chikis-rutas-'));
process.env.DATABASE_PATH = path.join(dir, 'test.sqlite');

const express = require('express');
const sequelize = require('../config/database');
const { Planificador, CuentaPadre, Venta, AccesoCredencial, PlanificadorCambio } = require('../models');
const { migrarCredenciales } = require('../services/migrarCredenciales');
const { daysFromNow, todayStr } = require('../utils/dateUtils');

let base; let server;
const api = async (metodo, ruta, body) => {
  const r = await fetch(base + ruta, { method: metodo, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  return { status: r.status, body: txt ? JSON.parse(txt) : null };
};
const raw = (sql) => sequelize.query(sql, { type: 'SELECT' });

before(async () => {
  await sequelize.sync();
  // Estado "legado": contraseña en claro en Cuentas Padre y copias desfasadas en cada pantalla
  await sequelize.query(`INSERT INTO cuentas_padre (cuentaId, nombreUsuario, contrasena, credito, fechaInicio, fechaFin, createdAt, updatedAt)
    VALUES ('M001', 'usuario_real', 'ClaveReal1', 50, '2026-01-01', '${daysFromNow(40)}', datetime('now'), datetime('now'))`);
  await Planificador.bulkCreate([
    { idPantalla: 'M001-1', cuentaId: 'M001', cuenta: 'usuario_VIEJO', password: 'copia_vieja', credito: 1, nombre: 'Ana', customerId: '100', nickname: 'Ana 1', pantallas: 1, duracionReal: daysFromNow(-5) },
    { idPantalla: 'M001-2', cuentaId: 'M001', cuenta: 'usuario_VIEJO', password: 'copia_vieja', credito: 1, nombre: 'Ana', customerId: '100', nickname: 'Ana 2', pantallas: 1, duracionReal: daysFromNow(20) },
  ]);
  await Venta.create({ idVM: 'VM100', idPantalla: 'M001-1', customerId: '100', nickname: 'Ana 1', fecha: '2026-10-01', precioVenta: 15000, tipoPlan: 'Plan Mensual', medioPago: 'Nequi' });

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = { id: 1, email: 'admin@test.com', role: 'admin' }; next(); });
  app.use('/api/admin', require('../routes/admin/planificador'));
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}/api/admin`;
});

after(async () => {
  await new Promise(r => server.close(r));
  await sequelize.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('migración de credenciales', () => {
  test('cifra la contraseña de Cuentas Padre y borra las copias del Planificador', async () => {
    const r = await migrarCredenciales();
    assert.equal(r.cifradas, 1);
    assert.equal(r.borradas, 2);
    const [cp] = await raw("SELECT contrasena FROM cuentas_padre WHERE cuentaId='M001'");
    assert.match(cp.contrasena, /^enc:v1:/);
    const copias = await raw("SELECT password FROM planificador WHERE password IS NOT NULL");
    assert.equal(copias.length, 0);
    assert.deepEqual(await migrarCredenciales(), { cifradas: 0, borradas: 0 }, 'idempotente');
  });
});

describe('GET /planificador', () => {
  test('datos de cuenta desde Cuentas Padre, sin contraseñas y sin escribir', async () => {
    const [antes] = await raw('SELECT MAX(updatedAt) m, COUNT(*) n FROM planificador');
    const { status, body } = await api('GET', '/planificador');
    assert.equal(status, 200);
    assert.equal(body.diasAlerta, 8);
    const p = body.pantallas.find(x => x.idPantalla === 'M001-1');
    assert.equal(p.cuenta, 'usuario_real');
    assert.equal(p.credito, 50);
    assert.equal(p.finalizacion, daysFromNow(40));
    assert.equal(p.tienePassword, true);
    assert.ok(!('password' in p));
    assert.ok(!JSON.stringify(body).includes('ClaveReal1'));
    assert.ok(!('syncPendiente' in body));
    const [despues] = await raw('SELECT MAX(updatedAt) m, COUNT(*) n FROM planificador');
    assert.deepEqual(despues, antes);
  });
});

describe('credenciales', () => {
  test('entrega la contraseña descifrada y deja constancia', async () => {
    const { status, body } = await api('POST', '/planificador/credenciales', { idPantallas: ['M001-1', 'M001-2'], motivo: 'tabla' });
    assert.equal(status, 200);
    assert.deepEqual(body.credenciales, { 'M001-1': 'ClaveReal1', 'M001-2': 'ClaveReal1' });
    const a = await AccesoCredencial.findOne({ order: [['id', 'DESC']] });
    assert.equal(a.usuarioEmail, 'admin@test.com');
    assert.equal(a.motivo, 'tabla');
    assert.equal(a.cantidad, 2);
  });
  test('rechaza motivos desconocidos y listas vacías', async () => {
    assert.equal((await api('POST', '/planificador/credenciales', { idPantallas: ['M001-1'], motivo: 'curiosidad' })).status, 400);
    assert.equal((await api('POST', '/planificador/credenciales', { idPantallas: [], motivo: 'tabla' })).status, 400);
  });
});

describe('PUT /planificador/:id', () => {
  test('los datos de cuenta se guardan en Cuentas Padre (cifrada) y aplican a todas sus pantallas', async () => {
    const { status, body } = await api('PUT', '/planificador/M001-1', { password: 'NuevaClave9', credito: 77 });
    assert.equal(status, 200);
    assert.deepEqual(body.cuentaPadreActualizada.sort(), ['contrasena', 'credito']);
    const [cp] = await raw("SELECT contrasena, credito FROM cuentas_padre WHERE cuentaId='M001'");
    assert.match(cp.contrasena, /^enc:v1:/);
    assert.equal(cp.credito, 77);
    const [fila] = await raw("SELECT password FROM planificador WHERE idPantalla='M001-1'");
    assert.equal(fila.password, null, 'el Planificador no vuelve a guardar copia');
    const otra = (await api('GET', '/planificador')).body.pantallas.find(x => x.idPantalla === 'M001-2');
    assert.equal(otra.credito, 77);
    const cred = await api('POST', '/planificador/credenciales', { idPantallas: ['M001-2'], motivo: 'edicion' });
    assert.equal(cred.body.credenciales['M001-2'], 'NuevaClave9');
  });

  test('un cambio de la pantalla queda en el historial (sin contraseñas) y se deshace', async () => {
    await api('PUT', '/planificador/M001-2', { nickname: 'Ana dos', cortesia: true });
    const h = await api('GET', '/planificador/historial?idPantalla=M001-2');
    const c = h.body.cambios[0];
    assert.equal(c.accion, 'editar');
    assert.deepEqual(c.cambios.map(x => x.campo).sort(), ['alertaReal', 'cortesia', 'nickname']);
    const todos = await raw('SELECT antes, despues FROM planificador_cambios');
    assert.ok(!JSON.stringify(todos).includes('NuevaClave9'));
    const d = await api('POST', `/planificador/historial/${c.id}/deshacer`);
    assert.equal(d.status, 200);
    const [f] = await raw("SELECT nickname, cortesia FROM planificador WHERE idPantalla='M001-2'");
    assert.equal(f.nickname, 'Ana 2'); assert.equal(f.cortesia, 0);
    assert.equal((await api('POST', `/planificador/historial/${c.id}/deshacer`)).status, 409, 'no dos veces');
  });
});

describe('renovación por la API', () => {
  test('crea la venta con el usuario de la cuenta padre y extiende el plan', async () => {
    const r = await api('POST', '/planificador/M001-1/renovar', { fecha: todayStr(), tipoPlan: 'Plan Mensual', meses: 1, precioVenta: 15000, medioPago: 'Nequi' });
    assert.equal(r.status, 201);
    assert.equal(r.body.venta.cuenta, 'usuario_real');
    assert.equal(r.body.pantalla.estadoReal, 'VIGENTE');
    assert.ok(!('password' in r.body.pantalla));
    assert.equal(await Venta.count(), 2);
    assert.equal((await PlanificadorCambio.findOne({ order: [['id', 'DESC']] })).accion, 'renovar');
  });
  test('valida: plan vacío → 400; pantalla inexistente → 404', async () => {
    assert.equal((await api('POST', '/planificador/M001-1/renovar', { meses: 1, precioVenta: 1, tipoPlan: '' })).status, 400);
    assert.equal((await api('POST', '/planificador/NOPE/renovar', { meses: 1, precioVenta: 1, tipoPlan: 'X' })).status, 404);
  });
});

describe('comprobante y endpoints retirados', () => {
  test('comprobante: usuario IPTV de la cuenta padre y sin contraseñas', async () => {
    const r = await api('GET', '/planificador/comprobante/Ana%201?idPantalla=M001-1&customerId=100');
    assert.equal(r.status, 200);
    assert.ok(r.body.pantallasDetalle.every(p => p.cuenta === 'usuario_real' && !('password' in p)));
  });
  test('sincronizar y restaurar ya no existen', async () => {
    assert.equal((await fetch(base + '/planificador/sync-cuentas-padre', { method: 'POST' })).status, 404);
    assert.equal((await fetch(base + '/planificador/sync-preview')).status, 404);
    assert.equal((await fetch(base + '/planificador/restore', { method: 'POST' })).status, 404);
  });
});
