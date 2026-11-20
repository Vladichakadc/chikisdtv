import { describe, it, expect } from 'vitest'
import { resumenPagos, mesEnCurso, medioDe, mesBonito, etiquetaTipoPago, tipoDe } from './resumenPagos'

const f = (fecha, precioVenta, extra = {}) => ({ fecha, precioVenta, tipoPago: 'Renovacion', medioPago: 'Nequi', customerId: '1', ...extra })
const filas = [
  f('2026-10-02', 20000),
  f('2026-10-15', 40000, { tipoPago: 'Activacion Pantalla', customerId: '2', medioPago: 'UN' }),
  f('2026-11-03', 30000, { medioPago: 'Nu' }),
  f('2026-11-05', 0, { tipoPago: 'Cortesia', customerId: '3' }),
  f('2026-11-06', 99000, { tipoPago: 'Cambio de Plan' }),
]

describe('resumen del módulo Pagos', () => {
  it('recaudo, ticket y clientes sin cortesías ni cambios de plan', () => {
    const r = resumenPagos(filas)
    expect(r.registros).toBe(5)
    expect(r.pagos).toBe(3)
    expect(r.recaudo).toBe(90000)
    expect(r.ticket).toBe(30000)
    expect(r.mediana).toBe(30000)
    expect(r.clientes).toBe(2)
    expect(r.porTipo.renovacion.ventas).toBe(2)
    expect(r.porTipo.activacion.monto).toBe(40000)
    expect(r.porTipo.cortesia.ventas).toBe(1)
    expect(r.porTipo.otros.ventas).toBe(1)
  })
  it('medios agrupados (NU) con porcentaje y serie de 12 meses', () => {
    const r = resumenPagos(filas)
    expect(r.medios[0]).toMatchObject({ nombre: 'NU', monto: 70000, ventas: 2 })
    expect(Math.round(r.medios[0].pct)).toBe(78)
    expect(r.serie).toHaveLength(12)
    expect(r.serie.at(-1)).toEqual({ mes: '2026-11', monto: 30000 })
  })
  it('mes en curso contra el mes anterior a la misma fecha', () => {
    const m = mesEnCurso(filas, { hoy: '2026-11-05' })
    expect(m.recaudo).toBe(30000)
    expect(m.mismaFechaAnterior).toBe(20000)
    expect(m.variacion).toBe(50)
    expect(m.proyeccion).toBe(180000)
    expect(m.hoyPagos).toBe(0)
  })
  it('formatos', () => {
    expect(medioDe('')).toBe('Sin registrar')
    expect(medioDe('Wester Union')).toBe('Western Union')
    expect(mesBonito('julio')).toBe('Julio')
    expect(etiquetaTipoPago('Activacion Pantalla')).toBe('Activación pantalla')
    expect(tipoDe('Cortesia')).toBe('cortesia')
  })
})
