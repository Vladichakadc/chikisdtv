import { describe, expect, test } from 'vitest'
import { calcularPulso, serieCerrada } from './pulso'

const hoy = new Date(2026, 10, 15) // 15 nov 2026 (30 días)
const mes = (key, ingresos, costos = 0, mrr = 0) => ({ key, ingresos, costos, mrr })
const porMes = [
  // 12 meses anteriores (nov 2024 – oct 2025): 1.000.000 c/u, costo 400.000
  ...Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2024, 10 + i, 1)
    return mes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 1000000, 400000, 800000)
  }),
  // últimos 12 meses cerrados (nov 2025 – oct 2026): 1.200.000, costo 360.000
  ...Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2025, 10 + i, 1)
    return mes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 1200000, 360000, 1000000 + i * 10000)
  }),
  mes('2026-11', 500000, 0, 0), // mes en curso
]
const bi = { porMes, kpis: { ticketPromedio: 50000 }, ltv: { segmentos: { concentracion: { pctIngresoTop: 47.9 } } } }
const operacion = {
  pantallas: { ocupadas: 100, total: 120 },
  guia: [{ pantallas: 3, clientes: [{}, {}] }, { pantallas: 1, clientes: [{}] }],
}
const retencion = {
  movimientos: [
    { mes: '2026-08', llegan: 5, seVan: 2, neto: 3, conServicio: 100 },
    { mes: '2026-09', llegan: 4, seVan: 6, neto: -2, conServicio: 98 },
    { mes: '2026-10', llegan: 6, seVan: 4, neto: 2, conServicio: 100 },
  ],
}
const stats = { montoDeudaTotal: 197260 } // ≈ 5 días de venta (14,4 M / 365 = 39.452/día)

const porId = (p) => Object.fromEntries(p.tarjetas.map(t => [t.id, t]))

describe('pulso del negocio', () => {
  test('serie de meses cerrados rellena los meses sin ventas', () => {
    const s = serieCerrada([{ key: '2026-10', ingresos: 7 }], 'ingresos', 3, hoy)
    expect(s.map(x => [x.key, x.valor])).toEqual([['2026-08', 0], ['2026-09', 0], ['2026-10', 7]])
  })

  const t = porId(calcularPulso({ bi, operacion, retencion, stats }, { hoy }))

  test('proyección de cierre: ritmo diario × días del mes', () => {
    expect(t.proyeccion.valor).toBe(1000000) // 500.000 / 15 × 30
    expect(t.proyeccion.delta).toBe(-16.7) // vs octubre 1.200.000
  })

  test('MRR del último mes cerrado', () => {
    expect(t.mrr.valor).toBe(1110000)
    expect(t.mrr.delta).toBe(0.9)
  })

  test('clientes: neto de 3 meses y abandono del último mes', () => {
    expect(t.neto.valor).toBe(3)
    expect(t.churn.valor).toBe(4.1) // 4 / 98
    expect(t.churn.tono).toBe('bueno')
  })

  test('margen de 12 meses y variación en puntos', () => {
    expect(t.margen.valor).toBe(70)
    expect(t.margen.delta).toBe(10) // 70% vs 60%
  })

  test('economía por pantalla, regla del 40 y cartera', () => {
    expect(t.pantalla.valor).toBe(12000 - 3000) // 1.200.000/100 − 360.000/120
    expect(t.regla40.valor).toBe(90) // +20% crecimiento + 70% margen
    expect(t.cartera.valor).toBe(5)
    expect(t.enJuego.valor).toBe(200000) // 4 pantallas × 50.000
    expect(t.concentracion.valor).toBe(47.9)
  })

  test('comparar contra el mismo mes del año anterior', () => {
    const bi2 = { ...bi, porMes: bi.porMes.map(m => (m.key === '2025-11' ? { ...m, ingresos: 800000, mrr: 900000 } : m)) }
    const a = porId(calcularPulso({ bi: bi2, operacion, retencion, stats }, { hoy, comparar: 'anio' }))
    expect(a.proyeccion.delta).toBe(25) // 1.000.000 vs nov 2025 (800.000)
    expect(a.proyeccion.deltaTexto).toBe('vs nov 2025')
  })
})
