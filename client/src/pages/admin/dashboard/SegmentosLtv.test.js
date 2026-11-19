import { describe, expect, test } from 'vitest'
import { bajadaSegmentos, titularSegmentos } from './SegmentosLtv'

const datos = {
  segmentos: [{ clave: 'top', pctIngreso: 47.9 }, { clave: 'base', pctIngreso: 3.7 }],
  concentracion: { clientesMitadIngreso: 56, pctClientesMitadIngreso: 21.8, vecesTopVsBase: 13 },
}

describe('lecturas de los segmentos de LTV', () => {
  test('titular con el aporte del 20% de mayor valor', () => {
    expect(titularSegmentos(datos)).toBe('El 20% de los clientes que más ha pagado genera el 47,9% del ingreso')
    expect(titularSegmentos({ segmentos: [] })).toBe(null)
  })
  test('bajada con la concentración', () => {
    expect(bajadaSegmentos(datos)).toBe('56 clientes (21,8% del total) suman la mitad de todo lo que ha entrado, y un cliente Top vale en promedio 13 veces lo que uno de la Base.')
  })
})
