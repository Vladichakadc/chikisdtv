const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calcularCandidatos } = require('../services/retencionBajas');

const fila = (extra) => ({
  id: 1, idBaja: 'BAJA01', nickname: 'Ana', nombre: 'Ana Pérez', customerId: '100', fechaBaja: '2026-10-01',
  categoria: 'economico', categoriaNombre: 'Precio', pantallas: 1, tipoPlan: 'Plan Mensual', recuperado: false,
  ultimaVenta: { tipoPlan: 'Plan Mensual', precioVenta: 20000, fecha: '2026-09-01' }, ...extra,
});

test('candidatos de retención: excluye recuperados, movimientos internos, fallecimientos y clientes aún activos', () => {
  const r = calcularCandidatos([
    fila({ id: 1 }),
    fila({ id: 2, customerId: '200', recuperado: true }),
    fila({ id: 3, customerId: '300', categoria: 'cambio_cuenta' }),
    fila({ id: 4, customerId: '400', categoria: 'fallecimiento' }),
    fila({ id: 5, customerId: '500' }),
  ], { activos: new Set(['500']), hoy: '2026-11-01' });
  assert.deepEqual(r.map(c => c.id), [1]);
  assert.equal(r[0].diasDesdeBaja, 31);
  assert.equal(r[0].ultimaVenta.precioVenta, 20000);
});

test('un cliente con varias bajas aparece una vez, con la más reciente, y la lista va de la más reciente a la más antigua', () => {
  const r = calcularCandidatos([
    fila({ id: 1, fechaBaja: '2026-03-01' }),
    fila({ id: 2, fechaBaja: '2026-08-01' }),
    fila({ id: 3, customerId: null, nickname: 'Sin ID', fechaBaja: '2026-09-15' }),
  ], { hoy: '2026-11-01' });
  assert.deepEqual(r.map(c => c.id), [3, 2]);
});
