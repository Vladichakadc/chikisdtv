// Pruebas de las reglas de estado del Planificador (servidor).
// Correr con: cd server && npm test
const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { DIAS_ALERTA, calcDias, estadoFromDias, alertaFromDias, varianteDe, esCortesia } = require('../utils/planificadorAlerta');

process.env.TZ = 'America/Bogota';
const HOY = new Date(2026, 10, 18, 12, 0, 0); // 18-11-2026 mediodía local

describe('planificadorAlerta', () => {
  beforeEach(() => mock.timers.enable({ apis: ['Date'], now: HOY }));
  afterEach(() => mock.timers.reset());

  test('días de alerta = 8 (una sola fuente)', () => {
    assert.equal(DIAS_ALERTA, 8);
  });

  test('calcDias cuenta días calendario en hora local', () => {
    assert.equal(calcDias('2026-11-18'), 0);
    assert.equal(calcDias('2026-11-19'), 1);
    assert.equal(calcDias('2026-11-10'), -8);
    assert.equal(calcDias(null), null);
    assert.equal(calcDias('basura'), null);
  });

  test('estadoFromDias: VENCIDO ≤ 0, ALERTA ≤ 8, VIGENTE', () => {
    assert.equal(estadoFromDias(0), 'VENCIDO');
    assert.equal(estadoFromDias(-3), 'VENCIDO');
    assert.equal(estadoFromDias(1), 'ALERTA');
    assert.equal(estadoFromDias(8), 'ALERTA');
    assert.equal(estadoFromDias(9), 'VIGENTE');
    assert.equal(estadoFromDias(null), '');
  });

  test('alertaFromDias respeta la cortesía (booleano o texto legado)', () => {
    assert.equal(alertaFromDias(-5, true), 'CORTESIA');
    assert.equal(alertaFromDias(-5, 'CORTESIA'), 'CORTESIA');
    assert.equal(alertaFromDias(-5, false), 'VENCIDO');
    assert.equal(alertaFromDias(3, null), 'PROXIMO A VENCER');
    assert.equal(alertaFromDias(30, 0), '');
  });

  test('esCortesia acepta booleano, 1 y texto', () => {
    assert.equal(esCortesia(true), true);
    assert.equal(esCortesia(1), true);
    assert.equal(esCortesia(' cortesia '), true);
    assert.equal(esCortesia(false), false);
    assert.equal(esCortesia('VENCIDO'), false);
    assert.equal(esCortesia(undefined), false);
  });

  test('varianteDe: libre / vencido / cortesía / alerta / vigente', () => {
    const base = { nombre: 'Ana', nickname: 'Ana 1' };
    assert.equal(varianteDe({ nickname: 'Libre' }), 'libre');
    assert.equal(varianteDe({}), 'libre');
    assert.equal(varianteDe({ ...base, duracionReal: '2026-11-18' }), 'vencido');
    assert.equal(varianteDe({ ...base, duracionReal: '2026-11-25', cortesia: true }), 'cortesia');
    // Una cortesía vencida se muestra vencida (misma prioridad que la UI)
    assert.equal(varianteDe({ ...base, duracionReal: '2026-11-01', cortesia: true }), 'vencido');
    assert.equal(varianteDe({ ...base, duracionReal: '2026-11-26' }), 'alerta');
    assert.equal(varianteDe({ ...base, duracionReal: '2026-11-27' }), 'vigente');
    assert.equal(varianteDe({ nickname: 'Solo nick', duracionReal: '2027-01-01' }), 'vigente');
  });
});
