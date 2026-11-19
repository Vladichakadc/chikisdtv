// Segmentos de valor (LTV): cinco grupos del mismo tamaño, cuánto del ingreso
// aporta cada uno y si sus clientes siguen con servicio.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { segmentosLtv } = require('../services/ltvSegmentos');

const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };

// 10 clientes: c1 paga 1.000.000, c2 500.000 … c10 10.000
const montos = [1000000, 500000, 300000, 200000, 150000, 100000, 80000, 50000, 20000, 10000];
const ltvRows = montos.map((ingresos, i) => ({ cid: `c${i + 1}`, ingresos, meses: 20 - i }));
const pantallas = [
  { customerId: 'c1', nombre: 'Ana', apellido: 'Top', nickname: 'Ana 1', duracionReal: dia(30) },   // con servicio
  { customerId: 'c2', nombre: 'Beto', nickname: 'Beto', duracionReal: dia(-10) },                    // vencido
  { customerId: 'c3', nombre: 'Caro', nickname: 'Caro', duracionReal: dia(-5) },
  { customerId: 'c3', nombre: 'Caro', nickname: 'Caro 2', duracionReal: dia(20) },                   // una vigente → con servicio
  { customerId: 'c9', nickname: 'Libre', duracionReal: dia(10) },                                   // libre: no cuenta
];

describe('segmentosLtv', () => {
  const r = segmentosLtv(ltvRows, pantallas);

  test('cinco grupos del mismo tamaño, de mayor a menor valor', () => {
    assert.deepEqual(r.segmentos.map(s => s.clientes), [2, 2, 2, 2, 2]);
    assert.deepEqual(r.segmentos.map(s => s.clave), ['top', 'alto', 'medio', 'bajo', 'base']);
    assert.equal(r.segmentos[0].ltvMax, 1000000);
    assert.equal(r.segmentos[0].ltvMin, 500000);
  });

  test('cuánto del ingreso aporta cada grupo (suma 100%)', () => {
    // Total 2.410.000; el top aporta 1.500.000 = 62,2%
    assert.equal(r.totalIngresos, 2410000);
    assert.equal(r.segmentos[0].pctIngreso, 62.2);
    const suma = r.segmentos.reduce((s, x) => s + x.pctIngreso, 0);
    assert.ok(Math.abs(suma - 100) < 0.5);
    assert.equal(r.concentracion.pctIngresoTop, 62.2);
  });

  test('estado de servicio: vigente gana a vencida; las libres no cuentan', () => {
    const top = r.segmentos[0];
    assert.equal(top.conServicio, 1);
    assert.equal(top.vencidos, 1);
    assert.deepEqual(top.vencidosLista.map(v => v.nombre), ['Beto']);
    assert.equal(r.segmentos[1].conServicio, 1); // c3 tiene una vigente
    assert.equal(r.segmentos[4].sinPantalla, 2);
  });

  test('concentración: cuántos clientes suman la mitad del ingreso', () => {
    assert.equal(r.concentracion.clientesMitadIngreso, 2); // 1.000.000 + 500.000 ≥ 1.205.000
    assert.equal(r.concentracion.vecesTopVsBase, 50); // 750.000 vs 15.000
    assert.equal(r.curva.at(-1).pctIngreso, 100);
    assert.equal(r.curva[0].pctClientes, 0);
  });

  test('sin datos', () => {
    assert.deepEqual(segmentosLtv([], []).segmentos, []);
  });
});
