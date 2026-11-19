// Dar de baja desde el Planificador: registra la baja completa en el módulo
// Bajas, deja la pantalla "Libre" (conserva la cuenta) y se puede deshacer.
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.TZ = 'America/Bogota';
const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'chikis-baja-')), 'test.sqlite');
process.env.DATABASE_PATH = dbFile;

const sequelize = require('../config/database');
const { Planificador, Baja, PlanificadorCambio, CuentaPadre } = require('../models');
const { prepararBaja, registrarBaja, siguienteIdBaja, ErrorBaja } = require('../services/bajaPlanificador');
const { deshacerCambio } = require('../services/historialPlanificador');

before(async () => {
  await sequelize.sync();
  await CuentaPadre.create({ cuentaId: 'M001', nombreUsuario: 'usuario_iptv', contrasena: 'secreta' });
  await Planificador.bulkCreate([
    { idPantalla: 'M001-1', cuentaId: 'M001', cuenta: 'usuario_iptv', nombre: 'Ana', apellido: 'Pérez', customerId: '100',
      nickname: 'Ana Sala', pantallas: 1, inicioReal: '2026-09-01', duracionPlan: 1, duracionReal: '2026-10-01', tipoPlan: 'Plan Mensual', debe: true, montoDebe: 15000 },
    { idPantalla: 'M001-2', cuentaId: 'M001', cuenta: 'usuario_iptv', nickname: 'Libre' },
  ]);
  await Baja.create({ idBaja: 'BAJA07', nickname: 'viejo', fechaBaja: '2025-01-01' });
});

after(async () => { await sequelize.close(); fs.rmSync(path.dirname(dbFile), { recursive: true, force: true }); });

describe('dar de baja desde el Planificador', () => {
  test('el siguiente código continúa la numeración', async () => {
    assert.equal(await siguienteIdBaja(), 'BAJA08');
  });

  test('prepararBaja sugiere todos los campos desde la pantalla', async () => {
    const { sugerido } = await prepararBaja('M001-1');
    assert.equal(sugerido.idBaja, 'BAJA08');
    assert.equal(sugerido.nickname, 'Ana Sala');
    assert.equal(sugerido.customerId, '100');
    assert.equal(sugerido.tipoPlan, 'Plan Mensual');
    assert.equal(sugerido.fecha, '2026-09-01');
  });

  test('sin motivo no se registra; "Otro motivo" exige observaciones; una pantalla libre no se da de baja', async () => {
    await assert.rejects(registrarBaja('M001-1', {}), ErrorBaja);
    await assert.rejects(registrarBaja('M001-1', { motivo: 'Otro motivo' }), ErrorBaja);
    await assert.rejects(registrarBaja('M001-2', { motivo: 'No usa el servicio' }), ErrorBaja);
    assert.equal(await Baja.count(), 1);
  });

  test('registra la baja completa y deja la pantalla Libre con la cuenta intacta', async () => {
    const r = await registrarBaja('M001-1', { motivo: 'Precio o problemas económicos', fechaBaja: '2026-11-10', devolucion: 'si', observaciones: 'Se quedó sin trabajo' }, 'admin@x.com');
    assert.equal(r.baja.idBaja, 'BAJA08');
    assert.equal(r.baja.estado, 'Desactivado');
    assert.equal(r.baja.anio, 2026);
    assert.equal(r.baja.mes, 'Noviembre');
    assert.equal(r.baja.devolucion, 'SI');
    assert.equal(r.baja.nickname, 'Ana Sala');
    assert.equal(r.baja.customerId, '100');
    const p = await Planificador.findByPk('M001-1');
    assert.equal(p.nickname, 'Libre');
    assert.equal(p.nombre, null);
    assert.equal(p.customerId, null);
    assert.equal(p.duracionReal, null);
    assert.equal(p.debe, false);
    assert.equal(p.cuentaId, 'M001');
    assert.equal(p.cuenta, 'usuario_iptv');
    const c = await PlanificadorCambio.findByPk(r.cambioId);
    assert.equal(c.accion, 'baja');
    assert.equal(c.ventaId, 'BAJA08');
  });

  test('deshacer restaura la pantalla y elimina la baja', async () => {
    const c = await PlanificadorCambio.findOne({ where: { accion: 'baja' } });
    const r = await deshacerCambio(c.id, 'admin@x.com');
    assert.equal(r.bajaEliminada, 'BAJA08');
    const p = await Planificador.findByPk('M001-1');
    assert.equal(p.nickname, 'Ana Sala');
    assert.equal(p.customerId, '100');
    assert.equal(p.duracionReal, '2026-10-01');
    assert.equal(await Baja.count({ where: { idBaja: 'BAJA08' } }), 0);
  });
});
