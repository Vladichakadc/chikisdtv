const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calcularAnalisisPagos, medioNormal, familiaPlan } = require('../services/analisisPagos');

const v = (fecha, precioVenta, extra = {}) => ({ fecha, precioVenta, tipoPago: 'Renovacion', tipoPlan: 'Plan Mensual', medioPago: 'Nequi', customerId: '1', nickname: 'Ana', ...extra });

const ventas = [
  v('2025-10-05', 10000),
  v('2026-09-03', 20000, { customerId: '2' }),
  v('2026-10-02', 30000),
  v('2026-10-20', 60000, { tipoPago: 'Activacion Pantalla', customerId: '3', medioPago: 'Paypal', tipoPlan: 'Plan Anual' }),
  v('2026-10-21', 0, { tipoPago: 'Cortesia' }),
  v('2026-10-22', 99000, { tipoPago: 'Cambio de Plan' }),
  v('2026-11-03', 15000, { medioPago: null }),
  v('2026-11-25', 99999), // futuro respecto a hoy: no cuenta
]

test('resumen: último mes cerrado, mes en curso con proyección y 12 meses', () => {
  const r = calcularAnalisisPagos(ventas, { hoy: '2026-11-10' })
  assert.equal(r.corte, '2026-10')
  const u = r.resumen.ultimoMes
  assert.equal(u.ingresos, 90000) // sin cortesía ni cambio de plan
  assert.equal(u.ventas, 2)
  assert.equal(u.vsMesPrevio, 350) // 90k vs 20k
  assert.equal(u.vsAnioAnterior, 800) // 90k vs 10k
  const c = r.resumen.enCurso
  assert.equal(c.ingresos, 15000)
  assert.equal(c.proyeccion, Math.round((15000 / 10) * 30))
  assert.equal(c.mismaAlturaMesAnterior, 30000) // octubre hasta el día 10
  assert.equal(r.resumen.doceMeses.ingresos, 110000) // nov-25 a oct-26
  assert.equal(r.resumen.doceMeses.anterior.ingresos, 10000)
  assert.equal(r.resumen.porTipo.activacion.ventas, 1)
  assert.equal(r.resumen.clientes.pagaron, 3)
  assert.equal(r.resumen.clientes.recurrentes, 0)
})

test('distribución: medios (con USD), planes, día del mes y concentración', () => {
  const r = calcularAnalisisPagos(ventas, { hoy: '2026-11-10' })
  const d = r.distribucion.ultimos12
  assert.deepEqual(d.medios.map(m => m.nombre), ['PayPal', 'Nequi'])
  assert.equal(d.usd.pct, 54.5)
  assert.equal(d.planes[0].nombre, 'Anual')
  assert.equal(d.dias.find(x => x.tramo === '1 al 5').ventas, 2)
  assert.equal(d.clientes.top[0].ingresos, 60000)
  assert.equal(d.clientes.n80, 2)
  assert.equal(r.distribucion.historico.sinMedio.ventas, 1)
})

test('serie y estacionalidad marcan el mes en curso como parcial', () => {
  const r = calcularAnalisisPagos(ventas, { hoy: '2026-11-10' })
  assert.equal(r.serie.length, 25)
  assert.equal(r.serie.at(-1).parcial, true)
  assert.equal(r.serie.at(-2).renovacion, 30000)
  assert.equal(r.serie.at(-2).activacion, 60000)
  const e2026 = r.estacionalidad.find(e => e.anio === '2026')
  assert.equal(e2026.meses[10].parcial, true)
  assert.equal(e2026.meses[11], null)
  const comp = r.comparativo.find(c => c.anio === '2026')
  assert.equal(comp.puntos[9], 110000)
  assert.equal(comp.puntos[10], null)
})

test('normalización de medios y planes', () => {
  assert.equal(medioNormal('NU'), 'Nu')
  assert.equal(medioNormal('Wester Union'), 'Western Union')
  assert.equal(medioNormal(''), 'Sin registrar')
  assert.equal(familiaPlan('3+1 Mundial'), 'Promociones')
  assert.equal(familiaPlan('Plan Semestral'), 'Semestral')
})
