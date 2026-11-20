import { describe, it, expect } from 'vitest'
import { normalizarTelefono, urlWhatsAppTexto, esDispositivoMovil } from './telefono'

describe('normalizarTelefono', () => {
  it('celular colombiano sin indicativo → 57', () => {
    expect(normalizarTelefono('300 123 4567')).toMatchObject({ numero: '573001234567', conIndicativo: true, origen: 'colombia' })
    expect(normalizarTelefono('3001234567', 'Colombia')).toMatchObject({ numero: '573001234567', conIndicativo: true })
  })
  it('respeta el indicativo escrito con + o 00', () => {
    expect(normalizarTelefono('+57 314 2243706')).toMatchObject({ numero: '573142243706', origen: 'internacional' })
    expect(normalizarTelefono('+34 612 345 678', 'Colombia')).toMatchObject({ numero: '34612345678', conIndicativo: true })
    expect(normalizarTelefono('0034612345678')).toMatchObject({ numero: '34612345678', conIndicativo: true })
  })
  it('usa el país del cliente para poner el indicativo', () => {
    expect(normalizarTelefono('612 345 678', 'España')).toMatchObject({ numero: '34612345678', conIndicativo: true, origen: 'pais' })
    expect(normalizarTelefono('(305) 555-0123', 'Estados Unidos')).toMatchObject({ numero: '13055550123', conIndicativo: true })
    expect(normalizarTelefono('0412 1234567', 'Venezuela')).toMatchObject({ numero: '584121234567', conIndicativo: true })
    expect(normalizarTelefono('9876 5432', 'Honduras')).toMatchObject({ numero: '50498765432', conIndicativo: true })
    expect(normalizarTelefono('06 12345678', 'Holanda')).toMatchObject({ numero: '31612345678' })
    expect(normalizarTelefono('416 555 0199', 'Canadá ')).toMatchObject({ numero: '14165550199' })
  })
  it('no duplica el indicativo si ya viene sin "+"', () => {
    expect(normalizarTelefono('34612345678', 'España')).toMatchObject({ numero: '34612345678' })
    expect(normalizarTelefono('573001234567', 'Colombia')).toMatchObject({ numero: '573001234567' })
  })
  it('sin país ni patrón conocido queda marcado sin indicativo', () => {
    expect(normalizarTelefono('612345678')).toMatchObject({ numero: '612345678', conIndicativo: false, origen: 'sin_indicativo' })
    expect(normalizarTelefono('')).toMatchObject({ numero: '', origen: 'vacio' })
    expect(normalizarTelefono(null)).toMatchObject({ origen: 'vacio' })
  })
})

describe('urlWhatsAppTexto', () => {
  it('celular: abre la app (api.whatsapp.com)', () => {
    expect(urlWhatsAppTexto('573001234567', 'Hola 📺', { movil: true })).toBe('https://api.whatsapp.com/send/?phone=573001234567&text=Hola%20%F0%9F%93%BA')
    expect(urlWhatsAppTexto('', 'Hola', { movil: true })).toBe('https://api.whatsapp.com/send/?text=Hola')
  })
  it('computador: abre WhatsApp Web con el chat y el texto', () => {
    expect(urlWhatsAppTexto('573001234567', 'Hola 📺', { movil: false })).toBe('https://web.whatsapp.com/send?phone=573001234567&text=Hola%20%F0%9F%93%BA')
    expect(urlWhatsAppTexto('573001234567', '', { movil: false })).toBe('https://web.whatsapp.com/send?phone=573001234567')
    expect(urlWhatsAppTexto('', '', { movil: false })).toBe('https://web.whatsapp.com/send')
  })
})

describe('esDispositivoMovil', () => {
  it('distingue celular, iPad y computador', () => {
    expect(esDispositivoMovil({ userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) Mobile Safari' })).toBe(true)
    expect(esDispositivoMovil({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' })).toBe(true)
    expect(esDispositivoMovil({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 5 })).toBe(true)
    expect(esDispositivoMovil({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131' })).toBe(false)
    expect(esDispositivoMovil({ userAgentData: { mobile: false }, userAgent: 'x' })).toBe(false)
  })
})
