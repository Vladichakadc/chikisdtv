import { describe, it, expect } from 'vitest'
import { titular, variacion, acciones, fmtPesosCorto, conMotivoReal } from './lecturas'

const cat = (clave, nombre, bajas, pctConMotivo) => ({ clave, nombre, bajas, pctConMotivo })
const data = (conMotivo, total, categorias) => ({ motivos: { ultimos12: { total, conMotivo, pctConMotivo: (conMotivo / total) * 100, categorias } } })

describe('lecturas de bajas', () => {
  it('titular con el motivo principal y advertencia si faltan motivos', () => {
    const t = titular(data(9, 38, [cat('no_usa', 'No usa el servicio', 5, 55.6), cat('sin_motivo', 'Sin motivo', 29, null)]))
    expect(t.titulo).toContain('No usa el servicio')
    expect(t.titulo).toContain('56%')
    expect(t.detalle).toContain('29')
    expect(t.tono).toBe('alerta')
  })
  it('sin ninguna baja con motivo pide clasificarlas', () => {
    expect(titular(data(0, 4, [cat('sin_motivo', 'Sin motivo', 4, null)])).titulo).toContain('Ninguna de las 4')
  })
  it('sin bajas', () => {
    expect(titular({ motivos: { ultimos12: { total: 0, categorias: [] } } }).tono).toBe('bien')
  })
  it('los movimientos internos no cuentan como motivo real', () => {
    expect(conMotivoReal([cat('cambio_cuenta', 'x', 3), cat('moroso', 'y', 1)]).map(c => c.clave)).toEqual(['moroso'])
  })
  it('variación y acciones', () => {
    expect(variacion(38, 34).tono).toBe('mal')
    expect(variacion(30, 34).tono).toBe('bien')
    expect(variacion(3, 0)).toBeNull()
    expect(acciones(data(6, 6, [cat('no_usa', 'a', 3), cat('economico', 'b', 2), cat('otro', 'c', 1)]))).toHaveLength(2)
    expect(fmtPesosCorto(723427)).toBe('$723 mil')
    expect(fmtPesosCorto(1250000)).toBe('$1,3 M')
  })
})
