// Análisis de retención: supervivencia por cobertura del plan, corte en el
// último mes cerrado y promedios ponderados por clientes.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calcularRetencion, mesesDePlan, ultimoMesCerrado } = require('../services/retencion');

const v = (customerId, fecha, tipoPago, tipoPlan = 'Plan Mensual') => ({ customerId, fecha, tipoPago, tipoPlan });

describe('mesesDePlan', () => {
  test('planes conocidos y planes "N + M"', () => {
    assert.equal(mesesDePlan('Plan Mensual'), 1);
    assert.equal(mesesDePlan('Plan Semestral'), 7);
    assert.equal(mesesDePlan('Plan Anual'), 14);
    assert.equal(mesesDePlan('3+1 Mundial'), 4);
    assert.equal(mesesDePlan('7 MESES + 1 MES GRATIS'), 8);
    assert.equal(mesesDePlan(null), 1);
  });
  test('último mes cerrado', () => {
    assert.equal(ultimoMesCerrado(new Date(2026, 10, 19)), '2026-10');
    assert.equal(ultimoMesCerrado(new Date(2026, 0, 5)), '2025-12');
  });
});

describe('calcularRetencion', () => {
  // Corte: 2026-06. Cohorte 2026-01 con 4 clientes:
  //  A mensual que renueva feb y mar (sigue hasta mar) → se va en abril
  //  B anual (cubre ene 2026 – feb 2027) → sigue
  //  C semestral (ene–jul) → sigue al corte
  //  D mensual que vuelve a pagar en mayo (pago tardío): sigue hasta mayo
  const ventas = [
    v('A', '2026-01-10', 'Activacion Pantalla'), v('A', '2026-02-10', 'Renovacion'), v('A', '2026-03-10', 'Renovacion'),
    v('B', '2026-01-15', 'Activacion Pantalla', 'Plan Anual'),
    v('C', '2026-01-20', 'Activacion Pantalla', 'Plan Semestral'),
    v('D', '2026-01-25', 'Activacion Pantalla'), v('D', '2026-05-02', 'Renovacion'),
    v('D', '2026-02-01', 'Cortesia'),
    // Cliente sin activación registrada: no entra
    v('X', '2026-01-05', 'Renovacion'),
    // Cohorte posterior al corte: no se mide
    v('E', '2026-07-03', 'Activacion Pantalla'),
  ];
  const r = calcularRetencion(ventas, { corte: '2026-06' });

  test('solo clientes con activación dentro del corte', () => {
    assert.equal(r.totalClientes, 4);
  });

  test('curva de supervivencia: mide hasta dónde llega la cobertura', () => {
    // D pagó tarde (mayo): cuenta como cliente que siguió, no como perdido y recuperado
    assert.equal(r.curva[0].pct, 100);
    const valores = r.curva.slice(0, 6).map(p => p.pct);
    assert.deepEqual([...valores].sort((a, b) => b - a), valores, 'la curva nunca sube');
  });

  test('hasta dónde llega cada cliente', () => {
    // A cubre hasta 2026-03 → cuenta en M0..M2; B y C siguen al corte; D llega a 2026-05
    assert.equal(r.siguenHoy, 2); // B y C (cobertura ≥ 2026-06)
    assert.deepEqual(r.curva.slice(0, 6).map(p => p.pct), [100, 100, 100, 75, 75, 50]);
  });

  test('ningún mes posterior al corte se mide', () => {
    assert.equal(r.curva[6].base, 0);
    assert.equal(r.curva[6].pct, null);
  });

  test('salidas: de los que seguían, cuántos se fueron ese mes', () => {
    assert.deepEqual(r.salidas.slice(0, 5).map(s => s.seVan), [0, 0, 1, 0, 1]);
  });

  test('retención por plan inicial', () => {
    const mensual = r.porPlan.find(p => p.plan === 'Plan Mensual');
    assert.equal(mensual.clientes, 2);
    assert.equal(r.porPlan.find(p => p.plan === 'Plan Anual').clientes, 1);
  });

  test('movimiento mes a mes: llegan, se van y con servicio', () => {
    const ene = r.movimientos.find(m => m.mes === '2026-01');
    assert.deepEqual(ene, { mes: '2026-01', llegan: 4, seVan: 0, neto: 4, conServicio: 4 });
    // A cubre hasta marzo → se va en abril; D cubre hasta mayo → se va en junio
    assert.equal(r.movimientos.find(m => m.mes === '2026-04').seVan, 1);
    assert.deepEqual(r.movimientos.find(m => m.mes === '2026-06'), { mes: '2026-06', llegan: 0, seVan: 1, neto: -1, conServicio: 2 });
    assert.equal(r.movimientos.at(-1).mes, '2026-06');
  });

  test('antigüedad de quienes siguen hoy', () => {
    // B y C activaron en enero: 5 meses al corte de junio
    assert.deepEqual(r.antiguedad.map(a => a.clientes), [0, 2, 0, 0, 0]);
  });

  test('curvas por año y por plan', () => {
    assert.equal(r.porAnio.length, 0); // menos de 5 clientes en 2026
    assert.equal(r.porPlan.find(p => p.plan === 'Plan Mensual').curva[0], 100);
  });

  test('promedio ponderado por clientes, no por cohortes', () => {
    const ventas2 = [
      // Cohorte grande (10 clientes), ninguno renueva
      ...Array.from({ length: 10 }, (_, i) => v(`g${i}`, '2026-01-05', 'Activacion Pantalla')),
      // Cohorte pequeña (1 cliente), renueva
      v('p', '2026-02-05', 'Activacion Pantalla'), v('p', '2026-03-05', 'Renovacion'),
    ];
    const r2 = calcularRetencion(ventas2, { corte: '2026-06' });
    // Mes 1: 1 de 11 sigue → 9,1% (un promedio simple por cohorte daría 50%)
    assert.equal(r2.curva[1].pct, 9.1);
  });

  test('cohortes de distinta antigüedad no hacen subir la curva', () => {
    // Cohorte vieja con mucha fuga a M1 + cohorte reciente sin fuga, medida solo hasta M1
    const ventas3 = [
      ...Array.from({ length: 4 }, (_, i) => v(`o${i}`, '2026-01-05', 'Activacion Pantalla')),
      v('o0', '2026-02-05', 'Renovacion'), v('o0', '2026-03-05', 'Renovacion'),
      ...Array.from({ length: 6 }, (_, i) => v(`n${i}`, '2026-05-05', 'Activacion Pantalla')),
      ...Array.from({ length: 6 }, (_, i) => v(`n${i}`, '2026-06-05', 'Renovacion')),
    ];
    const r3 = calcularRetencion(ventas3, { corte: '2026-06' });
    const valores = r3.curva.slice(0, 4).map(p => p.pct)
    assert.deepEqual([...valores].sort((a, b) => b - a), valores);
  });
});
