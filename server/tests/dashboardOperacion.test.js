// Indicadores operativos del Dashboard: una sola definición de vencida /
// por vencer, conteo por pantallas y por clientes, deuda COP + USD, equipos
// desde Inventario y caché que se invalida con cada escritura.
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'chikis-dash-')), 'test.sqlite');
process.env.DATABASE_PATH = dbFile;

const sequelize = require('../config/database');
const { Planificador, InventarioEquipo, VentaEquipo } = require('../models');
const { indicadoresOperacion } = require('../services/dashboardOperacion');
const { enCache, invalidarCache, invalidarTrasEscritura } = require('../utils/cacheDashboard');

const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };

before(async () => {
  await sequelize.sync();
  await Planificador.bulkCreate([
    // Andrea: dos pantallas vencidas (una vence hoy) + una por vencer → 1 cliente vencido
    { idPantalla: 'M1-1', cuentaId: 'M1', nombre: 'Andrea', customerId: '20', nickname: 'Andrea 1', pantallas: 1, duracionReal: dia(-5), debe: true, montoDebe: 20000 },
    { idPantalla: 'M1-2', cuentaId: 'M1', nombre: 'Andrea', customerId: '20', nickname: 'Andrea 2', pantallas: 1, duracionReal: dia(0) },
    { idPantalla: 'M1-3', cuentaId: 'M1', nombre: 'Andrea', customerId: '20', nickname: 'Andrea 3', pantallas: 1, duracionReal: dia(3) },
    // Luis: por vencer y con deuda en dólares
    { idPantalla: 'M2-1', cuentaId: 'M2', nombre: 'Luis', customerId: '30', nickname: 'Luis', pantallas: 1, duracionReal: dia(8), debe: true, montoDebeUSD: 12.5 },
    // Vigente, cortesía y libres
    { idPantalla: 'M2-2', cuentaId: 'M2', nombre: 'Ana', customerId: '40', nickname: 'Ana', pantallas: 2, duracionReal: dia(40) },
    { idPantalla: 'M2-3', cuentaId: 'M2', nickname: 'Prueba', pantallas: 1, duracionReal: dia(5), cortesia: true },
    { idPantalla: 'M3-1', cuentaId: 'M3', nickname: 'Libre', pantallas: 1, duracionReal: dia(-30) },
    { idPantalla: 'M3-2', cuentaId: 'M3', pantallas: 1 },
  ]);
  await VentaEquipo.create({ idVM: 'VM1', serial: 'S2', precioVenta: 1 });
  await InventarioEquipo.bulkCreate([
    { idInventario: 'in1', serie: 'S1', estado: 'En Bodega' },
    { idInventario: 'in2', serie: 'S2', estado: 'En Bodega' }, // vendido (tiene venta)
    { idInventario: 'in3', serie: 'S3', estado: 'Vendido' },
  ]);
});

after(async () => { await sequelize.close(); fs.rmSync(path.dirname(dbFile), { recursive: true, force: true }); });

describe('indicadoresOperacion', () => {
  test('vencidas y por vencer en pantallas y en clientes', async () => {
    const r = await indicadoresOperacion();
    assert.deepEqual(r.vencidas, { pantallas: 2, clientes: 1, venceHoy: 1 });
    // Andrea ya cuenta como vencida: por vencer solo queda Luis (la cortesía no entra)
    assert.deepEqual(r.porVencer, { pantallas: 2, clientes: 1 });
    assert.deepEqual(r.listas.vencidas.map(p => p.idPantalla), ['M1-1', 'M1-2']);
    assert.deepEqual(r.listas.porVencer.map(p => p.idPantalla), ['M1-3', 'M2-1']);
    assert.ok(r.listas.vencidas.every(p => !('password' in p)));
  });

  test('capacidad, cortesías y clientes activos', async () => {
    const r = await indicadoresOperacion();
    assert.deepEqual(r.pantallas, { total: 9, ocupadas: 7, libres: 2, cortesias: 1 });
    assert.equal(r.capacidad.pctOcupacion, 78);
    assert.equal(r.clientes.activos, 4);
  });

  test('deuda por clientes únicos, separada en COP y USD', async () => {
    const r = await indicadoresOperacion();
    assert.deepEqual(r.deuda, { clientes: 2, cop: 20000, usd: 12.5 });
  });

  test('equipos desde Inventario: disponibles = sin venta y no vendidos', async () => {
    const r = await indicadoresOperacion();
    assert.deepEqual(r.equipos, { total: 3, disponibles: 1, vendidos: 2 });
  });
});

describe('caché del Dashboard', () => {
  test('reutiliza el valor y se invalida con una escritura exitosa', async () => {
    invalidarCache();
    let n = 0;
    const calc = async () => ++n;
    assert.equal(await enCache('x', calc), 1);
    assert.equal(await enCache('x', calc), 1);
    // Simula un POST exitoso que pasa por el middleware
    const listeners = {};
    const res = { statusCode: 201, on: (ev, fn) => { listeners[ev] = fn; } };
    invalidarTrasEscritura({ method: 'POST' }, res, () => {});
    listeners.finish();
    assert.equal(await enCache('x', calc), 2);
    // Un GET o una escritura fallida no invalidan
    const res2 = { statusCode: 400, on: (ev, fn) => { listeners[ev] = fn; } };
    invalidarTrasEscritura({ method: 'PUT' }, res2, () => {}); listeners.finish();
    assert.equal(await enCache('x', calc), 2);
  });

  test('peticiones simultáneas comparten un solo cálculo', async () => {
    invalidarCache();
    let n = 0;
    const calc = () => new Promise(r => setTimeout(() => r(++n), 20));
    const [a, b] = await Promise.all([enCache('y', calc), enCache('y', calc)]);
    assert.equal(a, 1); assert.equal(b, 1); assert.equal(n, 1);
  });
});
