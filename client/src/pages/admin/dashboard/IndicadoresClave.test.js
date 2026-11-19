import { describe, expect, test } from 'vitest'
import { ingresosDelMes } from './IndicadoresClave'

describe('ingresos del mes', () => {
  const porMes = [
    { key: '2026-10', ingresos: 3000000, numVentas: 40 },
    { key: '2026-11', ingresos: 646600, numVentas: 4, parcial: true },
  ]
  test('toma el mes en curso y el anterior', () => {
    expect(ingresosDelMes(porMes, new Date(2026, 10, 19))).toEqual({
      mes: 'noviembre', mesAnterior: 'octubre', ingresos: 646600, ventas: 4, ingresosAnterior: 3000000,
    })
  })
  test('enero compara con diciembre del año anterior; sin datos da cero', () => {
    const r = ingresosDelMes([{ key: '2025-12', ingresos: 5, numVentas: 1 }], new Date(2026, 0, 3))
    expect(r).toMatchObject({ mes: 'enero', mesAnterior: 'diciembre', ingresos: 0, ventas: 0, ingresosAnterior: 5 })
  })
})
