import { describe, expect, test } from 'vitest'
import { causaDelMes, deCadaDiez, recomendaciones, textoDeDiez, textoMes, titular } from './lecturas'

const data = {
  totalClientes: 257, siguenHoy: 125,
  hitos: [{ mes: 1, pct: 98.4 }, { mes: 3, pct: 98.1 }, { mes: 6, pct: 97.7 }, { mes: 12, pct: 84.6 }],
  momentoCritico: { mes: 7, base: 242, seVan: 25, pct: 10.3 },
  porPlan: [
    { plan: 'Plan Mensual', hitos: { 12: 79.7, 18: 70 } },
    { plan: 'Plan Semestral', hitos: { 12: 80.9, 18: 72 } },
    { plan: 'Plan Anual', hitos: { 12: 100, 18: 85.5 } },
  ],
}

describe('lecturas de retención', () => {
  test('de cada diez y textos de mes', () => {
    expect(deCadaDiez(84.6)).toBe(8)
    expect(deCadaDiez(null)).toBe(null)
    expect(textoDeDiez(98.4)).toBe('casi todos siguen')
    expect(textoDeDiez(84.6)).toBe('8 de cada 10 siguen')
    expect(textoMes(1)).toBe('al mes')
    expect(textoMes(12)).toBe('al año')
    expect(textoMes(6)).toBe('a los 6 meses')
  })
  test('los picos se explican por el fin de cada plan', () => {
    expect(causaDelMes(7)).toMatch(/semestral/)
    expect(causaDelMes(14)).toMatch(/anual/)
    expect(causaDelMes(4)).toBe(null)
  })
  test('titular a un año', () => {
    expect(titular(data)).toEqual({ mes: 12, pct: 84.6, deDiez: 8 })
  })
  test('recomendaciones en orden: momento crítico, plan, base actual', () => {
    const r = recomendaciones(data)
    expect(r.map(x => x.tono)).toEqual(['rojo', 'verde', 'neutro'])
    expect(r[0].titulo).toBe('El mes 7 es el momento en que más clientes se van')
    expect(r[0].texto).toContain('se van 10,3')
    expect(r[1].titulo).toBe('Los clientes de plan anual se quedan más')
    expect(r[1].texto).toContain('A los 18 meses siguen 85,5% de quienes entran con plan anual, frente a 70%')
    expect(r[2].titulo).toBe('Hoy siguen con servicio 125 de 257 clientes activados')
  })
})
