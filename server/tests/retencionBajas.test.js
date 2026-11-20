const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calcularCandidatos } = require('../services/retencionBajas');
const { ordenRecientes } = require('../services/analisisBajas');

const fila = (extra) => ({
  id: 1, idBaja: 'BAJA01', nickname: 'Ana', nombre: 'Ana Pérez', customerId: '100', fechaBaja: '2026-10-01',
  categoria: 'economico', categoriaNombre: 'Precio', pantallas: 1, tipoPlan: 'Plan Mensual', recuperado: false,
  ultimaVenta: { tipoPlan: 'Plan Mensual', precioVenta: 20000, fecha: '2026-09-01' }, ...extra,
});

test('plan de retención: lista todas las bajas con su estado', () => {
  const r = calcularCandidatos([
    fila({ id: 1 }),
    fila({ id: 2, idBaja: 'BAJA02', customerId: '200', recuperado: true }),
    fila({ id: 3, idBaja: 'BAJA03', customerId: '300', categoria: 'cambio_cuenta' }),
    fila({ id: 4, idBaja: 'BAJA04', customerId: '400', categoria: 'fallecimiento' }),
    fila({ id: 5, idBaja: 'BAJA05', customerId: '500' }),
  ], { activos: new Set(['500']), hoy: '2026-11-01' });
  assert.equal(r.length, 5);
  const estado = Object.fromEntries(r.map(c => [c.id, c.estado]));
  assert.deepEqual(estado, { 1: 'por_recuperar', 2: 'volvio', 3: 'interno', 4: 'fallecimiento', 5: 'activo' });
  assert.equal(r.find(c => c.id === 1).diasDesdeBaja, 31);
});

test('orden: la más reciente primero, a igual fecha el código más alto, sin fecha al final', () => {
  const r = calcularCandidatos([
    fila({ id: 1, idBaja: 'BAJA9', fechaBaja: '2026-03-01' }),
    fila({ id: 2, idBaja: 'BAJA149', fechaBaja: '2026-05-31' }),
    fila({ id: 3, idBaja: 'BAJA150', fechaBaja: '2026-05-31' }),
    fila({ id: 4, idBaja: 'BAJA200', fechaBaja: null }),
    fila({ id: 5, idBaja: 'BAJA10', fechaBaja: '2026-08-01' }),
  ], { hoy: '2026-11-01' });
  assert.deepEqual(r.map(c => c.id), [5, 3, 2, 1, 4]);
  assert.equal(r[4].diasDesdeBaja, null);
  assert.equal(typeof ordenRecientes, 'function');
});
