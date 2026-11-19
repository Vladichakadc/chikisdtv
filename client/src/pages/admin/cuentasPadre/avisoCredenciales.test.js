import { describe, expect, test } from 'vitest'
import { mensajeAvisoCredenciales, saludoDe } from './avisoCredenciales'

describe('aviso de cambio de credenciales', () => {
  test('saluda por el primer nombre, o por el nickname', () => {
    expect(saludoDe({ nombre: 'Andrea Maestre' })).toBe('¡Hola, Andrea! 👋')
    expect(saludoDe({ nickname: 'Tio Fermin' })).toBe('¡Hola, Tio Fermin! 👋')
    expect(saludoDe({})).toBe('¡Hola! 👋')
  })

  test('incluye el usuario y la contraseña de la cuenta', () => {
    const m = mensajeAvisoCredenciales({ nombre: 'Ana', usuario: 'cli3026', contrasena: 'Abc123' })
    expect(m).toContain('mantenimiento programado')
    expect(m).toContain('*Usuario:* cli3026')
    expect(m).toContain('*Contraseña:* Abc123')
  })
})
