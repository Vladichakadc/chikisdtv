import { describe, expect, test } from 'vitest'
import { fmtCorto, separarEtiquetas, ultimoConDato } from './etiquetas'

describe('etiquetas de los gráficos', () => {
  test('formato corto de porcentajes', () => {
    expect(fmtCorto(84.6)).toBe('85%')
    expect(fmtCorto(3.25)).toBe('3,3%')
    expect(fmtCorto(null)).toBe('')
  })
  test('último índice con dato', () => {
    expect(ultimoConDato([100, 90, null, null])).toBe(1)
    expect(ultimoConDato([null])).toBe(-1)
  })
  test('separa etiquetas finales que quedarían montadas', () => {
    const d = separarEtiquetas([{ clave: 'a', valor: 75.7 }, { clave: 'b', valor: 75 }, { clave: 'c', valor: 40 }], 200)
    expect(d.a).toBe(0)
    expect(d.b).toBeGreaterThan(10) // empujada hacia abajo
    expect(d.c).toBe(0)
  })
})
