import { describe, it, expect } from 'vitest'
import { unirConServicio, resumenClientes, formatoTelefono, faltantes } from './resumenClientes'

const rows = [
  { customerId: '1', nombre: 'Ana', apellido: 'Pérez', genero: 'F', pais: 'Colombia', ciudad: 'Bogotá', tipoCliente: 'Final', movil: '3001234567' },
  { customerId: '2', nombre: 'Beto', apellido: '', genero: '', pais: 'España', ciudad: '', tipoCliente: 'Revendedor', movil: '+34 612345678', referido: '1' },
  { customerId: '3', nombre: 'Caro', apellido: 'Ruiz', genero: 'F', pais: '', ciudad: 'Cali', tipoCliente: 'Final', movil: '+57 ' },
]
const servicio = {
  1: { estado: 'activo', pantallas: 1, recaudo12m: 80000, totalPagado: 200000, pagos: 5 },
  2: { estado: 'por_vencer', pantallas: 3, recaudo12m: 300000, totalPagado: 300000, pagos: 3 },
}

describe('módulo Clientes', () => {
  it('une la tabla con el estado del servicio (sin datos → sin servicio)', () => {
    const u = unirConServicio(rows, servicio)
    expect(u.map(r => r.estadoServicio)).toEqual(['activo', 'por_vencer', 'sin_servicio'])
    expect(u[2].pantallas).toBe(0)
  })
  it('resumen de la selección', () => {
    const r = resumenClientes(unirConServicio(rows, servicio))
    expect(r.total).toBe(3)
    expect(r.porEstado).toMatchObject({ activo: 1, por_vencer: 1, sin_servicio: 1 })
    expect(r.pantallas).toBe(4)
    expect(r.recaudo12m).toBe(380000)
    expect(r.ltv).toBe(250000)
    expect(r.top).toEqual({ nombre: 'Beto', monto: 300000 })
    expect(r.tipos[0]).toMatchObject({ nombre: 'Final', n: 2, pantallas: 1 })
    expect(r.datos).toMatchObject({ movil: 1, pais: 1, apellido: 1, genero: 1, ciudad: 1 })
    expect(r.completos).toBe(1)
    expect(r.referidos).toBe(1)
  })
  it('faltantes y formato de teléfono', () => {
    expect(faltantes(rows[2])).toEqual(['movil', 'pais'])
    expect(formatoTelefono('3001234567', 'Colombia')).toBe('+57 300 123 4567')
    expect(formatoTelefono('+34 612345678', 'España')).toBe('+34 612 345 678')
    expect(formatoTelefono('', 'Colombia')).toBe('')
  })
})
