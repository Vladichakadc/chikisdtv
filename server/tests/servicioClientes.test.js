const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calcularServicioClientes } = require('../services/servicioClientes');

test('estado del servicio por cliente: activo, por vencer, vencido y sin servicio', () => {
  const r = calcularServicioClientes({
    pantallas: [
      { customerId: '1', nickname: 'Ana', duracionReal: '2026-12-31' },
      { customerId: '2', nickname: 'Beto', duracionReal: '2026-11-25' },
      { customerId: '2', nickname: 'Beto2', duracionReal: '2027-01-10' },
      { customerId: '3', nickname: 'Caro', duracionReal: '2026-11-01' },
      { customerId: '4', nickname: 'Libre', duracionReal: null },
      { customerId: '5', nickname: 'Dani', duracionReal: null, cortesia: true },
    ],
    ventas: [
      { customerId: '1', fecha: '2026-10-01', precioVenta: 80000, tipoPago: 'Renovacion' },
      { customerId: '1', fecha: '2024-01-01', precioVenta: 15000, tipoPago: 'Renovacion' },
      { customerId: '1', fecha: '2026-10-02', precioVenta: 0, tipoPago: 'Cortesia' },
      { customerId: '6', fecha: '2025-05-01', precioVenta: 15000, tipoPago: 'Renovacion' },
    ],
    bajas: [{ customerId: '6', fechaBaja: '2025-06-01' }],
  }, { hoy: '2026-11-20' });
  assert.equal(r['1'].estado, 'activo')
  assert.equal(r['1'].totalPagado, 95000)
  assert.equal(r['1'].recaudo12m, 80000)
  assert.equal(r['1'].pagos, 2)
  assert.equal(r['1'].ultimoPago, '2026-10-01')
  assert.equal(r['1'].diasSinPagar, 50)
  assert.equal(r['2'].estado, 'por_vencer')
  assert.equal(r['2'].pantallas, 2)
  assert.equal(r['2'].diasVence, 5)
  assert.equal(r['3'].estado, 'vencido')
  assert.equal(r['4'], undefined) // pantalla Libre no cuenta
  assert.equal(r['5'].estado, 'activo') // cortesía sin fecha
  assert.equal(r['6'].estado, 'sin_servicio')
  assert.equal(r['6'].bajas, 1)
});
