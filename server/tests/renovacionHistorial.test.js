// Renovación en un paso + historial/deshacer del Planificador sobre una BD
// SQLite temporal.
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.TZ = 'America/Bogota';
const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'chikis-renov-')), 'test.sqlite');
process.env.DATABASE_PATH = dbFile;

const sequelize = require('../config/database');
const { Planificador, Venta, PlanificadorCambio, CuentaPadre } = require('../models');
const { registrarRenovacion, sumarMeses, inicioSugerido } = require('../services/renovacionService');
const { registrarCambio, deshacerCambio, deshacerLote, nuevoLote, ConflictoDeshacer } = require('../services/historialPlanificador');
const { todayStr, daysFromNow } = require('../utils/dateUtils');
const { conCuentaPadre } = require('../services/cuentaPadreDatos');

const fila = (id, extra = {}) => ({
  idPantalla: id, cuentaId: id.split('-')[0], cuenta: 'usuario_iptv', password: 'secreta',
  nombre: 'Ana', apellido: 'Pérez', customerId: '100', nickname: `Ana ${id}`, pantallas: 1,
  inicioReal: '2026-01-01', duracionPlan: 1, duracionReal: daysFromNow(-10), debe: true, montoDebe: 15000, ...extra,
});

before(async () => {
  await sequelize.sync();
  await CuentaPadre.create({ cuentaId: 'M001', nombreUsuario: 'usuario_iptv', contrasena: 'secreta' });
  await Planificador.bulkCreate([
    fila('M001-1'),
    fila('M001-2', { duracionReal: daysFromNow(5), debe: false, montoDebe: null }),
    fila('M001-3', { nickname: 'Libre', nombre: null, apellido: null }),
    fila('M001-4'),
  ]);
  await Venta.create({ idVM: 'VM2563', nickname: 'x', fecha: '2026-01-01' });
});

after(async () => { await sequelize.close(); fs.rmSync(path.dirname(dbFile), { recursive: true, force: true }); });

describe('fechas de la renovación', () => {
  test('sumarMeses respeta el calendario', () => {
    assert.equal(sumarMeses('2026-01-15', 1), '2026-02-15');
    assert.equal(sumarMeses('2026-06-01', 7), '2027-01-01');
    assert.equal(sumarMeses('2026-11-18', 14), '2028-01-18');
  });
  test('el nuevo período arranca en la fecha de vencimiento (vigente o vencido); sin fecha, el día del pago', () => {
    assert.equal(inicioSugerido(daysFromNow(5), '2026-11-18'), daysFromNow(5));
    assert.equal(inicioSugerido(daysFromNow(-3), '2026-11-18'), daysFromNow(-3));
    assert.equal(inicioSugerido(null, '2026-11-18'), '2026-11-18');
    assert.equal(inicioSugerido('basura', '2026-11-18'), '2026-11-18');
  });
});

describe('registrarRenovacion', () => {
  test('plan vencido: crea la venta y extiende desde la fecha de vencimiento, sin deuda', async () => {
    const hoy = todayStr();
    const venc = daysFromNow(-10);
    const r = await registrarRenovacion('M001-1', { fecha: hoy, meses: 1, precioVenta: 15000, tipoPlan: 'Plan Mensual', medioPago: 'Nequi' }, 'admin@x.com');
    assert.equal(r.venta.idVM, 'VM2564');
    assert.equal(r.venta.tipoPago, 'Renovacion');
    assert.equal(r.venta.idPantalla, 'M001-1');
    assert.equal(r.venta.customerId, '100');
    assert.equal(r.inicioReal, venc);
    assert.equal(r.duracionReal, sumarMeses(venc, 1));
    const p = await Planificador.findByPk('M001-1');
    assert.equal(p.duracionReal, sumarMeses(venc, 1));
    assert.equal(p.duracionPlan, 1);
    assert.equal(p.debe, false);
    assert.equal(p.montoDebe, null);
    const c = await PlanificadorCambio.findByPk(r.cambioId);
    assert.equal(c.accion, 'renovar');
    assert.equal(c.ventaId, 'VM2564');
    assert.ok(!String(c.antes).includes('secreta'), 'el historial no guarda la contraseña');
  });

  test('plan vigente: arranca donde termina el actual (no se pierden días)', async () => {
    const r = await registrarRenovacion('M001-2', { fecha: todayStr(), meses: 7, precioVenta: 80000, tipoPlan: 'Plan Semestral' });
    assert.equal(r.inicioReal, daysFromNow(5));
    assert.equal(r.duracionReal, sumarMeses(daysFromNow(5), 7));
  });

  test('se puede fijar el inicio a mano', async () => {
    const r = await registrarRenovacion('M001-4', { fecha: todayStr(), meses: 1, precioVenta: 15000, tipoPlan: 'Plan Mensual', inicioReal: '2026-12-01' });
    assert.equal(r.duracionReal, '2027-01-01');
  });

  test('valida datos y no deja nada a medias', async () => {
    const ventasAntes = await Venta.count();
    await assert.rejects(registrarRenovacion('M001-3', { meses: 1, precioVenta: 1, tipoPlan: 'Plan Mensual' }), /titular/);
    await assert.rejects(registrarRenovacion('M001-1', { meses: 0, precioVenta: 1, tipoPlan: 'Plan Mensual' }), /meses/);
    await assert.rejects(registrarRenovacion('M001-1', { meses: 1, precioVenta: 1, tipoPlan: '' }), /plan/);
    await assert.rejects(registrarRenovacion('NOEXISTE', { meses: 1, precioVenta: 1, tipoPlan: 'X' }), /no encontrada/);
    assert.equal(await Venta.count(), ventasAntes);
  });
});

describe('historial y deshacer', () => {
  test('deshacer una renovación revierte el plan y elimina la venta', async () => {
    const antes = (await Planificador.findByPk('M001-4')).toJSON();
    const r = await registrarRenovacion('M001-4', { fecha: todayStr(), meses: 14, precioVenta: 150000, tipoPlan: 'Plan Anual' });
    assert.ok(await Venta.findByPk(r.venta.idVM));
    const d = await deshacerCambio(r.cambioId, 'admin@x.com');
    assert.equal(d.ventaEliminada, r.venta.idVM);
    assert.equal(await Venta.findByPk(r.venta.idVM), null);
    const p = await Planificador.findByPk('M001-4');
    assert.equal(p.duracionReal, antes.duracionReal);
    assert.equal(p.duracionPlan, antes.duracionPlan);
    assert.equal((await PlanificadorCambio.findByPk(r.cambioId)).deshecho, true);
  });

  test('no se deshace dos veces', async () => {
    const ultimo = await PlanificadorCambio.findOne({ where: { accion: 'renovar', deshecho: true } });
    await assert.rejects(deshacerCambio(ultimo.id, 'x'), ConflictoDeshacer);
  });

  test('conflicto: si la pantalla cambió después, no se pisa', async () => {
    const antes = await Planificador.findByPk('M001-2');
    await Planificador.update({ nickname: 'Nuevo nick' }, { where: { idPantalla: 'M001-2' } });
    const c = await registrarCambio({ accion: 'editar', idPantalla: 'M001-2', antes, despues: await Planificador.findByPk('M001-2') });
    await Planificador.update({ nickname: 'Otro cambio posterior' }, { where: { idPantalla: 'M001-2' } });
    await assert.rejects(deshacerCambio(c.id, 'x'), (e) => e instanceof ConflictoDeshacer && e.detalles[0].campo === 'Nickname');
    assert.equal((await Planificador.findByPk('M001-2')).nickname, 'Otro cambio posterior');
  });

  test('editar sin cambios reales no ensucia el historial', async () => {
    const f = await Planificador.findByPk('M001-2');
    assert.equal(await registrarCambio({ accion: 'editar', idPantalla: 'M001-2', antes: f, despues: f }), null);
  });

  test('deshacer una eliminación recrea la pantalla; la contraseña sigue saliendo de su cuenta padre', async () => {
    const f = await Planificador.findByPk('M001-3');
    await Planificador.destroy({ where: { idPantalla: 'M001-3' } });
    const c = await registrarCambio({ accion: 'eliminar', idPantalla: 'M001-3', antes: f, despues: null });
    await deshacerCambio(c.id, 'x');
    const r = await Planificador.findByPk('M001-3');
    assert.equal(r.nickname, 'Libre');
    assert.equal((await conCuentaPadre(r.toJSON())).password, 'secreta');
  });

  test('deshacer un lote es todo o nada', async () => {
    const lote = nuevoLote();
    for (const id of ['M001-1', 'M001-2']) {
      const a = await Planificador.findByPk(id);
      await Planificador.update({ tipoPlan: 'Promo X' }, { where: { idPantalla: id } });
      await registrarCambio({ accion: 'sincronizar', idPantalla: id, antes: a, despues: await Planificador.findByPk(id), lote });
    }
    // Un cambio posterior en una de las dos bloquea el lote completo
    await Planificador.update({ tipoPlan: 'Otra' }, { where: { idPantalla: 'M001-1' } });
    await assert.rejects(deshacerLote(lote, 'x'), ConflictoDeshacer);
    assert.equal((await Planificador.findByPk('M001-2')).tipoPlan, 'Promo X', 'no se aplicó nada');
    await Planificador.update({ tipoPlan: 'Promo X' }, { where: { idPantalla: 'M001-1' } });
    const r = await deshacerLote(lote, 'x');
    assert.equal(r.deshechos, 2);
    assert.notEqual((await Planificador.findByPk('M001-2')).tipoPlan, 'Promo X');
  });
});
