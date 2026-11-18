// La regla de estados está escrita dos veces: en la UI (rowHelpers.js) y en el
// servidor (server/utils/planificadorAlerta.js). Esta prueba las enfrenta con
// los mismos casos para que nunca vuelvan a divergir (antes la tabla usaba 7
// días de alerta y el servidor 8).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRequire } from 'node:module'
import { getRowVariant, calcDias, DIAS_ALERTA_DEFAULT } from './rowHelpers'

const require = createRequire(import.meta.url)
const servidor = require('../../../../../server/utils/planificadorAlerta.js')

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 18, 12, 0, 0)) })
afterEach(() => { vi.useRealTimers() })

const fecha = (dias) => {
  const d = new Date(2026, 10, 18 + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('reglas UI = reglas servidor', () => {
  it('mismos días de alerta', () => {
    expect(DIAS_ALERTA_DEFAULT).toBe(servidor.DIAS_ALERTA)
  })

  it('mismo cálculo de días', () => {
    for (let d = -40; d <= 40; d++) expect(calcDias(fecha(d))).toBe(servidor.calcDias(fecha(d)))
  })

  it('misma variante para cada combinación de días, cortesía y titular', () => {
    const titulares = [
      { nombre: 'Ana', nickname: 'Ana 1' },
      { nickname: 'Solo nick' },
      { nickname: 'Libre' },
      {},
    ]
    const cortesias = [{}, { cortesia: true }, { cortesia: false }, { alertaReal: 'CORTESIA' }, { alertaReal: 'VENCIDO' }]
    let casos = 0
    for (let d = -15; d <= 15; d++) {
      for (const t of titulares) {
        for (const c of cortesias) {
          const fila = { ...t, ...c, duracionReal: fecha(d) }
          expect(getRowVariant(fila), JSON.stringify(fila)).toBe(servidor.varianteDe(fila))
          casos++
        }
      }
    }
    expect(casos).toBe(31 * 4 * 5)
  })

  it('sin días de alerta explícitos se usa el valor por defecto (no se pierde la alerta)', () => {
    expect(getRowVariant({ nombre: 'Ana', duracionReal: fecha(8) })).toBe('alerta')
    expect(getRowVariant({ nombre: 'Ana', duracionReal: fecha(9) })).toBe('vigente')
  })
})
