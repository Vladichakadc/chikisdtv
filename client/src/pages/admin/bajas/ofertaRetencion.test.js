import { describe, it, expect } from 'vitest'
import { construirOferta, preciosBase, urlWhatsApp, redondear500, estrategiaDe, DESCUENTO_MAXIMO } from './ofertaRetencion'

const planes = [
  { nombre: 'Plan Mensual 1 Pantalla', precio: 15000, numeroPantallas: 1 },
  { nombre: 'Plan Semestral 1 Pantalla', precio: 80000, numeroPantallas: 1 },
  { nombre: 'Plan Anual 1 Pantalla', precio: 150000, numeroPantallas: 1 },
  { nombre: 'Plan Mensual 2 Pantallas', precio: 25000, numeroPantallas: 2 },
]
const cand = (extra = {}) => ({
  nombre: 'Daniel Rangel', nickname: 'Daniel', categoria: 'economico', pantallas: 1, tipoPlan: 'Plan Mensual',
  ultimaVenta: { tipoPlan: 'Plan Mensual', precioVenta: 15000, fecha: '2026-06-02' }, ...extra,
})

describe('oferta de retención', () => {
  it('arma las tres modalidades con descuento redondeado y valor por mes', () => {
    const o = construirOferta(cand(), planes, { descuento: 20, hoy: '2026-11-19', vigenciaDias: 7 })
    expect(o.opciones.map(x => x.clave)).toEqual(['mensual', 'semestral', 'anual'])
    const anual = o.opciones.find(x => x.clave === 'anual')
    expect(anual.precio).toBe(120000)
    expect(anual.meses).toBe(14)
    expect(anual.porMes).toBe(8571)
    expect(anual.ahorroVsMensual).toBe(15000 * 14 - 120000)
    expect(o.validoHasta).toBe('2026-11-26')
  })
  it('respeta el precio que pagaba el cliente si es menor que el catálogo', () => {
    const { base, respetado } = preciosBase(cand({ ultimaVenta: { tipoPlan: 'Plan Mensual', precioVenta: 12000 } }), planes)
    expect(base.mensual).toBe(12000)
    expect(respetado.mensual).toBe(true)
  })
  it('usa las pantallas del cliente y omite modalidades sin precio', () => {
    const o = construirOferta(cand({ pantallas: 2, ultimaVenta: null, tipoPlan: 'Plan Mensual' }), planes, { descuento: 0, hoy: '2026-11-19' })
    expect(o.opciones.map(x => x.clave)).toEqual(['mensual'])
    expect(o.opciones[0].precio).toBe(25000)
  })
  it('el descuento nunca pasa del máximo', () => {
    const o = construirOferta(cand(), planes, { descuento: 80, hoy: '2026-11-19' })
    expect(o.descuento).toBe(DESCUENTO_MAXIMO)
  })
  it('el mensaje lleva nombre, último plan, precios tachados, medios de pago y fecha límite', () => {
    const { mensaje } = construirOferta(cand(), planes, { descuento: 20, recomendado: 'anual', hoy: '2026-11-19' })
    expect(mensaje).toContain('¡Hola Daniel!')
    expect(mensaje).toContain('*Plan Mensual*')
    expect(mensaje).toContain('~$150.000~ *$120.000*')
    expect(mensaje).toContain('para tu pantalla:')
    expect(mensaje).toContain('Nequi')
    expect(mensaje).toContain('Llave BreB')
    expect(mensaje).toContain('Solo hasta el 26 de noviembre')
    expect(mensaje).toMatch(/Anual\* \(12 meses \+ 2 de regalo 🎁\).*\n.*⭐ \*Recomendado\*/)
  })
  it('estrategia por motivo y utilidades', () => {
    expect(estrategiaDe()).toEqual(estrategiaDe('no_usa'))
    expect(estrategiaDe().descuento).toBe(DESCUENTO_MAXIMO)
    expect(estrategiaDe().recomendado).toBe('anual')
    expect(redondear500(13740)).toBe(13500)
    expect(urlWhatsApp('573001112233', 'Hola 👋')).toBe('https://web.whatsapp.com/send?phone=573001112233&text=Hola%20%F0%9F%91%8B')
    expect(urlWhatsApp('573001112233', 'x', { movil: true })).toContain('api.whatsapp.com')
  })
})
