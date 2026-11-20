import { describe, it, expect } from 'vitest'
import { titular, tarjetas, recomendaciones, fmtPesosCorto, fmtCompacto, nombreMes, sumarMesesYm, tonoVar } from './lecturas'

const datos = () => ({
  resumen: {
    ultimoMes: { mes: '2026-10', ingresos: 4200000, ventas: 70, ticket: 60000, vsMesPrevio: 12.5, vsAnioAnterior: -3 },
    enCurso: { mes: '2026-11', dia: 10, diasMes: 30, ingresos: 1000000, proyeccion: 3000000, mismaAlturaMesAnterior: 1500000, vsMismaAltura: -33.3 },
    doceMeses: { desde: '2025-11', hasta: '2026-10', ingresos: 40000000, ventas: 700, ticket: 57143, promedioMensual: 3333333, vsAnterior: 5, ticketVsAnterior: 8, anterior: { ingresos: 38000000, ticket: 52900 } },
    porTipo: { renovacion: { pctIngresos: 70, ventas: 600, ingresos: 28000000 }, activacion: { pctIngresos: 30, ventas: 100, ingresos: 12000000, ticket: 120000 } },
    activaciones: { actuales: 100, anteriores: 130, vsAnterior: -23.1 },
    clientes: { pagaron: 200, vsAnterior: 4, recurrentes: 90, pctRecurrentes: 45 },
  },
  distribucion: { ultimos12: {
    medios: [{ nombre: 'Nequi', pct: 74, ingresos: 29600000 }, { nombre: 'Nu', pct: 13, ingresos: 5200000 }],
    dias: [{ tramo: '1 al 5', ingresos: 9000000, pct: 22 }, { tramo: '6 al 10', ingresos: 7000000, pct: 17 }],
    usd: { pct: 6.2, ventas: 18, ingresos: 2480000 },
    sinMedio: { ventas: 3, pctVentas: 0.4 },
    clientes: { pctTop10: 16, n80: 119, total: 195, pctN80: 61 },
  } },
})

describe('lecturas del análisis de pagos', () => {
  it('titular con el recaudo del último mes cerrado y sus comparaciones', () => {
    const t = titular(datos())
    expect(t.titulo).toBe('En octubre entraron $4.200.000')
    expect(t.detalle).toContain('12,5% más que el mes anterior')
    expect(t.detalle).toContain('3% menos que en octubre 2025')
    expect(t.tono).toBe('bien')
  })
  it('nueve tarjetas con cifra, nota y explicación', () => {
    const ts = tarjetas(datos())
    expect(ts).toHaveLength(9)
    expect(ts.every(t => t.titulo && t.valor && t.queEs && t.comoSeCalcula)).toBe(true)
    expect(ts.find(t => t.clave === 'medio').alerta).toBe('Alta dependencia de un canal')
    expect(ts.find(t => t.clave === 'enCurso').valor).toBe('$3 M')
  })
  it('recomendaciones según los datos', () => {
    const rs = recomendaciones(datos())
    expect(rs[0].texto).toContain('por debajo')
    expect(rs.some(r => r.texto.includes('Nequi'))).toBe(true)
    expect(rs.some(r => r.texto.includes('1 al 5'))).toBe(true)
    expect(rs.some(r => r.texto.includes('activaciones bajaron'))).toBe(true)
    expect(rs.length).toBeLessThanOrEqual(5)
  })
  it('utilidades', () => {
    expect(fmtPesosCorto(37385733)).toBe('$37,4 M')
    expect(fmtCompacto(2609200)).toBe('2,6M')
    expect(fmtCompacto(431000)).toBe('431k')
    expect(nombreMes('2026-05')).toBe('mayo 2026')
    expect(sumarMesesYm('2026-01', -1)).toBe('2025-12')
    expect(tonoVar(-10)).toBe('mal')
  })
})
