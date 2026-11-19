const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { MOTIVOS_BAJA, categoriaMotivo } = require('../utils/motivosBaja');

test('clasifica motivos guardados, antiguos y textos libres', () => {
  assert.equal(categoriaMotivo('No usa el servicio').clave, 'no_usa');
  assert.equal(categoriaMotivo('Precio elevado').clave, 'economico');
  assert.equal(categoriaMotivo('Problemas económicos').clave, 'economico');
  assert.equal(categoriaMotivo('Problemas de señal').clave, 'senal');
  assert.equal(categoriaMotivo('Cliente moroso').clave, 'moroso');
  assert.equal(categoriaMotivo('Cancelación temporal').clave, 'temporal');
  assert.equal(categoriaMotivo('Viaje o mudanza').clave, 'temporal');
  assert.equal(categoriaMotivo('Cambio de proveedor').clave, 'competencia');
  assert.equal(categoriaMotivo('algo raro').clave, 'otro');
  assert.equal(categoriaMotivo('').clave, 'sin_motivo');
  assert.equal(categoriaMotivo(null).clave, 'sin_motivo');
});

test('el catálogo del cliente es el mismo que el del servidor', () => {
  const cliente = fs.readFileSync(path.join(__dirname, '../../client/src/config/motivosBaja.js'), 'utf8');
  const nombres = [...cliente.matchAll(/nombre: '([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(nombres, MOTIVOS_BAJA.map(m => m.nombre));
});
