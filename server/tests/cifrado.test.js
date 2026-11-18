const { test } = require('node:test');
const assert = require('node:assert/strict');

const cargar = (clave) => {
  if (clave === undefined) delete process.env.CREDENCIALES_KEY; else process.env.CREDENCIALES_KEY = clave;
  delete require.cache[require.resolve('../utils/cifrado')];
  return require('../utils/cifrado');
};

test('cifra y descifra (AES-256-GCM) con IV distinto cada vez', () => {
  const { cifrar, descifrar, estaCifrado } = cargar('clave-de-prueba');
  const a = cifrar('Calugo2022'); const b = cifrar('Calugo2022');
  assert.ok(estaCifrado(a)); assert.notEqual(a, b);
  assert.ok(!a.includes('Calugo2022'));
  assert.equal(descifrar(a), 'Calugo2022');
});

test('no cifra dos veces ni toca vacíos', () => {
  const { cifrar } = cargar('clave-de-prueba');
  const a = cifrar('x');
  assert.equal(cifrar(a), a);
  assert.equal(cifrar(''), ''); assert.equal(cifrar(null), null);
});

test('texto plano heredado se lee tal cual (migración sin cortes)', () => {
  const { descifrar } = cargar('clave-de-prueba');
  assert.equal(descifrar('plano123'), 'plano123');
});

test('con otra clave no se puede leer (y no rompe)', () => {
  const c1 = cargar('clave-A'); const v = c1.cifrar('secreta');
  const c2 = cargar('clave-B');
  assert.equal(c2.descifrar(v), null);
});

test('sin clave: guarda en claro y no lee lo cifrado', () => {
  const v = cargar('clave-A').cifrar('secreta');
  const sin = cargar(undefined);
  assert.equal(sin.cifrar('abc'), 'abc');
  assert.equal(sin.descifrar(v), null);
  assert.equal(sin.cifradoActivo(), false);
});
