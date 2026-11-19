import { describe, expect, test } from 'vitest'
import { listar, mensajeAvisoCredenciales, saludoDe, segmentosWhatsApp } from './avisoCredenciales'

describe('aviso de cambio de credenciales', () => {
  test('saluda por el primer nombre, o por el nickname', () => {
    expect(saludoDe({ nombre: 'Andrea Maestre' })).toBe('¡Hola, Andrea! 👋')
    expect(saludoDe({ nickname: 'Tio Fermin' })).toBe('¡Hola, Tio Fermin! 👋')
    expect(saludoDe({})).toBe('¡Hola! 👋')
  })

  test('lista nicknames en negrita', () => {
    expect(listar(['A'])).toBe('*A*')
    expect(listar(['A', 'B', 'C'])).toBe('*A*, *B* y *C*')
  })

  test('nombra el nickname afectado, FlujoTV y las credenciales', () => {
    const m = mensajeAvisoCredenciales({ nombre: 'Catalina', nicknames: ['Catalina Gomez'], usuario: 'cli3026', contrasena: 'Abc123' })
    expect(m).toContain('aplicación *FlujoTV*')
    expect(m).toContain('de tu cuenta:\n\n📺 *Catalina Gomez*')
    expect(m).toContain('donde usas *Catalina Gomez*')
    expect(m).toContain('👤 Usuario: `cli3026`')
    expect(m).toContain('🔑 Contraseña: `Abc123`')
    expect(m).not.toContain('ℹ️')
  })

  test('varias cuentas del cliente: las afectadas y las que no cambian', () => {
    const m = mensajeAvisoCredenciales({ nombre: 'Andrea', nicknames: ['Andrea 1', 'Andrea 2'], otrasCuentas: ['Andrea 3'], usuario: 'u', contrasena: 'p', nota: 'Gracias' })
    expect(m).toContain('de tus cuentas:\n\n📺 *Andrea 1* y *Andrea 2*')
    expect(m).toContain('los dispositivos donde usas')
    expect(m).toContain('Tu otra cuenta (*Andrea 3*) *no cambia*')
    expect(m).toContain('📝 Gracias')
  })

  test('segmenta el formato de WhatsApp para la vista previa', () => {
    expect(segmentosWhatsApp('Hola *Ana*, usa `abc`')).toEqual([
      { tipo: 'texto', valor: 'Hola ' }, { tipo: 'negrita', valor: 'Ana' },
      { tipo: 'texto', valor: ', usa ' }, { tipo: 'codigo', valor: 'abc' },
    ])
  })
})
