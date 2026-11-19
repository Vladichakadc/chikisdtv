// Análisis de Bajas: motivos por categoría, ingreso perdido, vida antes de la
// baja, clientes recuperados y bajas sin motivo para clasificar.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calcularAnalisisBajas } = require('../services/analisisBajas');

const venta = (customerId, fecha, tipoPago, tipoPlan, precioVenta) => ({ customerId, fecha, tipoPago, tipoPlan, precioVenta });
const baja = (id, customerId, fechaBaja, motivo, extra = {}) => ({ id, idBaja: `BAJA${id}`, customerId, fechaBaja, motivo, nickname: `nick${id}`, pantallas: 1, tipoPlan: 'Plan Mensual', ...extra });

const ventas = [
  venta('A', '2025-01-10', 'Activacion Pantalla', 'Plan Mensual', 30000),
  venta('A', '2026-05-10', 'Renovacion', 'Plan Mensual', 30000),
  venta('B', '2026-01-05', 'Activacion Pantalla', 'Plan Semestral', 140000), // 7 meses → 20.000/mes
  venta('B', '2026-09-01', 'Renovacion', 'Plan Mensual', 30000),             // vuelve después de la baja
  venta('C', '2026-08-01', 'Activacion Pantalla', 'Plan Mensual', 30000),
];
const bajas = [
  baja(1, 'A', '2026-06-01', 'Precio elevado'),
  baja(2, 'B', '2026-08-01', 'No usa el servicio', { tipoPlan: 'Plan Semestral', devolucion: 'SI' }),
  baja(3, 'C', '2026-08-20', null, { observaciones: 'no contesta' }),
  baja(4, 'C', '2026-08-21', 'Cambio de cuenta o de pantalla'), // movimiento interno
  baja(5, 'X', '2023-01-01', 'Cliente moroso'),                // fuera de los 12 meses
];

describe('calcularAnalisisBajas', () => {
  const r = calcularAnalisisBajas(bajas, ventas, { hoy: '2026-11-19' });

  test('resumen de los últimos 12 meses sin contar movimientos internos', () => {
    assert.equal(r.resumen.bajas12, 3);
    assert.equal(r.resumen.movimientosInternos, 1);
    assert.equal(r.resumen.totalHistorico, 4);
    assert.equal(r.resumen.devoluciones12, 1);
  });

  test('ingreso mensual perdido: última venta ÷ meses del plan', () => {
    // A: 30.000 (mensual) · B: 140.000 / 7 = 20.000 · C: 30.000
    assert.equal(r.resumen.ingresoPerdido12, 80000);
  });

  test('vida antes de la baja y recuperados', () => {
    assert.equal(r.resumen.recuperados12, 1); // B volvió en septiembre
    const nu = r.motivos.ultimos12.categorias.find(c => c.clave === 'no_usa');
    assert.equal(nu.pctRecuperados, 100);
    assert.equal(nu.vidaPromedio, 6.9); // 5 ene → 1 ago
  });

  test('motivos: % sobre las bajas con motivo; las sin motivo van aparte y al final', () => {
    const m = r.motivos.ultimos12;
    assert.equal(m.total, 3);
    assert.equal(m.conMotivo, 2);
    assert.deepEqual(m.categorias.map(c => c.clave), ['economico', 'no_usa', 'sin_motivo']);
    assert.equal(m.categorias[0].pctConMotivo, 50);
    assert.equal(m.categorias.at(-1).pctConMotivo, null);
    assert.equal(m.pctConMotivo, 66.7);
  });

  test('bajas por mes con motivo apilado', () => {
    assert.equal(r.porMes.length, 24);
    const ago = r.porMes.find(m => m.mes === '2026-08');
    assert.equal(ago.bajas, 2);
    assert.equal(ago.no_usa, 1);
    assert.equal(ago.sin_motivo, 1);
  });

  test('lista para clasificar: solo las sin motivo, recientes primero', () => {
    assert.deepEqual(r.sinMotivo.map(b => b.idBaja), ['BAJA3']);
    assert.equal(r.sinMotivo[0].observaciones, 'no contesta');
  });

  test('tramos de vida', () => {
    const total = r.vida.reduce((s, t) => s + t.bajas, 0);
    assert.equal(total, 3);
    assert.equal(r.vida.find(t => t.tramo === '1 a 2 años').bajas, 1); // A: 16,7 meses
  });
});
