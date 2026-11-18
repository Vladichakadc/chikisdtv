// Pruebas de la lógica de precios del mensaje de renovación (casos reales del
// negocio). Correr con: cd client && npm test
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ofertasDe, construirMensaje, esRenovable, mesesGratisDe, mesesDePlan, etapaSugerida, etapaPendiente, prepararRenovacion } from './renovacion'
import { haceTexto } from './rowHelpers'

// Catálogo de venta como el de producción: combos de 1, 2 y 3 pantallas.
// Semestral 210 días (7 meses) y Anual 426 días (14 meses).
const CATALOGO = [
  { nombre: 'Plan Mensual 1 Pantalla',    precio: 15000,  duracionDias: 30,  numeroPantallas: 1 },
  { nombre: 'Plan Semestral 1 Pantalla',  precio: 80000,  duracionDias: 210, numeroPantallas: 1 },
  { nombre: 'Plan Anual 1 Pantalla',      precio: 150000, duracionDias: 426, numeroPantallas: 1 },
  { nombre: 'Plan Mensual 2 Pantallas',   precio: 25000,  duracionDias: 30,  numeroPantallas: 2 },
  { nombre: 'Plan Semestral 2 Pantallas', precio: 140000, duracionDias: 210, numeroPantallas: 2 },
  { nombre: 'Plan Anual 2 Pantallas',     precio: 260000, duracionDias: 426, numeroPantallas: 2 },
  { nombre: 'Plan Mensual 3 Pantallas',   precio: 33000,  duracionDias: 30,  numeroPantallas: 3 },
]

// Hoy fijo: 18-11-2026 (mediodía local, para no depender de la zona horaria)
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 18, 12, 0, 0)) })
afterEach(() => { vi.useRealTimers() })

const fila = (extra = {}) => ({
  idPantalla: 'M004-2', nickname: 'Xiomy 2', nombre: 'Xiomara', customerId: '173',
  pantallas: 1, duracionReal: '2026-11-10', estadoReal: 'VENCIDO', alertaReal: '', ...extra,
})

function mensajePara(row, catalogo = CATALOGO, { identificarCuenta = false } = {}) {
  const pantallas = Math.max(1, Math.floor(Number(row.pantallas)) || 1)
  const oferta = ofertasDe(catalogo, pantallas)
  return { ...oferta, texto: construirMensaje({ row, pantallas, ...oferta, identificarCuenta }) }
}

describe('meses de regalo salen del catálogo', () => {
  it('convierte duracionDias a meses', () => {
    expect(mesesDePlan(30)).toBe(1)
    expect(mesesDePlan(210)).toBe(7)
    expect(mesesDePlan(426)).toBe(14)
    expect(mesesDePlan(365)).toBe(12)
    expect(mesesDePlan(null)).toBe(0)
  })
  it('regalo = meses del plan − meses pagados, nunca negativo', () => {
    expect(mesesGratisDe(210, 6)).toBe(1)
    expect(mesesGratisDe(426, 12)).toBe(2)
    expect(mesesGratisDe(365, 12)).toBe(0)
    expect(mesesGratisDe(30, 1)).toBe(0)
    expect(mesesGratisDe(undefined, 6)).toBe(0)
  })
  it('si el catálogo quita el regalo del Anual, el mensaje deja de prometerlo', () => {
    const sinRegalo = CATALOGO.map(p => (p.nombre === 'Plan Anual 1 Pantalla' ? { ...p, duracionDias: 365 } : p))
    const { texto } = mensajePara(fila(), sinRegalo)
    expect(texto).toContain('*Plan Anual 1 Pantalla*: $150.000 · 12 meses')
    expect(texto).not.toMatch(/Anual 1 Pantalla.*REGALAMOS/)
    expect(texto).toMatch(/Semestral 1 Pantalla.*REGALAMOS 1 mes/)
  })
})

describe('1 cuenta de 1 pantalla', () => {
  it('oferta los precios de 1 pantalla con los regalos del catálogo', () => {
    const { texto, combo, porPantalla, ofertas } = mensajePara(fila())
    expect(combo).toBe(false)
    expect(porPantalla).toBe(false)
    expect(ofertas.map(o => o.precio)).toEqual([15000, 80000, 150000])
    expect(texto).toContain('*Plan Mensual 1 Pantalla*: $15.000 · 1 mes — ideal para ir mes a mes')
    expect(texto).toContain('pagas 6 meses ¡y te REGALAMOS 1 mes! Son 7 meses corridos')
    expect(texto).toContain('pagas 12 meses ¡y te REGALAMOS 2 meses! Son 14 meses corridos')
    expect(texto).toContain('se venció el 10-11-2026')
    expect(texto).toContain('¡Hola, Xiomara!')
  })
  it('próxima a vencer usa el texto de "vence en N días"', () => {
    const { texto } = mensajePara(fila({ duracionReal: '2026-11-23', estadoReal: 'ALERTA' }))
    expect(texto).toContain('vence en 5 días (el 23-11-2026)')
    expect(texto).toContain('sin que se te corte la señal')
  })
})

describe('cliente con varias cuentas', () => {
  it('nombra la cuenta que vence y cobra solo esa (precio de 1 pantalla)', () => {
    const { texto, ofertas } = mensajePara(fila(), CATALOGO, { identificarCuenta: true })
    expect(texto).toContain('el plan de tu cuenta *Xiomy 2* de')
    expect(ofertas[0].precio).toBe(15000)
  })
  it('sin varias cuentas no menciona el nickname', () => {
    const { texto } = mensajePara(fila())
    expect(texto).not.toContain('*Xiomy 2*')
  })
})

describe('combo y sin combo', () => {
  it('cuenta de 2 pantallas con combo en el catálogo → precios del combo', () => {
    const { texto, combo, ofertas } = mensajePara(fila({ pantallas: 2 }))
    expect(combo).toBe(true)
    expect(ofertas.map(o => o.precio)).toEqual([25000, 140000, 260000])
    expect(texto).toContain('Como esta cuenta tiene 2 pantallas')
    expect(texto).toContain('*Plan Mensual 2 Pantallas* (2 pantallas): $25.000')
  })
  it('cuenta de 3 pantallas solo con Mensual en el catálogo → oferta solo lo catalogado', () => {
    const { ofertas, combo } = mensajePara(fila({ pantallas: 3 }))
    expect(combo).toBe(true)
    expect(ofertas.map(o => o.nombre)).toEqual(['Plan Mensual 3 Pantallas'])
  })
  it('cuenta de 4 pantallas sin combo → precios por pantalla', () => {
    const { texto, combo, porPantalla, ofertas } = mensajePara(fila({ pantallas: 4 }))
    expect(combo).toBe(false)
    expect(porPantalla).toBe(true)
    expect(ofertas.map(o => o.precio)).toEqual([15000, 80000, 150000])
    expect(texto).toContain('Esta cuenta tiene 4 pantallas — estos son los precios por cada pantalla')
  })
})

describe('cortesía y estados', () => {
  it('una cortesía nunca es renovable (no se le cobra)', () => {
    expect(esRenovable(fila({ alertaReal: 'CORTESIA' }))).toBe(false)
  })
  it('la cortesía como campo propio (booleano) también bloquea el cobro', () => {
    expect(esRenovable(fila({ cortesia: true, alertaReal: 'VENCIDO' }))).toBe(false)
    expect(esRenovable(fila({ cortesia: false }))).toBe(true)
  })
  it('vencida y próxima a vencer sí son renovables; vigente no', () => {
    expect(esRenovable(fila({ estadoReal: 'VENCIDO' }))).toBe(true)
    expect(esRenovable(fila({ estadoReal: 'ALERTA' }))).toBe(true)
    expect(esRenovable(fila({ estadoReal: 'VIGENTE' }))).toBe(false)
  })
})

describe('Recordado hace N días', () => {
  it('interpreta las fechas de SQLite y las ISO', () => {
    expect(haceTexto('2026-11-18 14:50:55.009 +00:00')).toBe('hoy')
    expect(haceTexto('2026-11-17T15:00:00.000Z')).toBe('ayer')
    expect(haceTexto('2026-11-16 15:00:00.000 +00:00')).toBe('hace 2 días')
    expect(haceTexto(null)).toBe('')
  })
})

describe('secuencia de cobro (antes / día / +3 días)', () => {
  it('sugiere la etapa según los días al vencimiento', () => {
    expect(etapaSugerida(5)).toBe('antes')
    expect(etapaSugerida(1)).toBe('antes')
    expect(etapaSugerida(0)).toBe('dia')
    expect(etapaSugerida(-2)).toBe('dia')      // se ponen al día si no salió a tiempo
    expect(etapaSugerida(-3)).toBe('despues')
    expect(etapaSugerida(-40)).toBe('despues')
    expect(etapaSugerida(null)).toBe('despues')
  })
  it('lo pendiente hoy es la etapa sugerida si aún no se envió en este ciclo', () => {
    expect(etapaPendiente(0, [])).toBe('dia')
    expect(etapaPendiente(0, ['antes'])).toBe('dia')
    expect(etapaPendiente(0, ['antes', 'dia'])).toBe(null)
    expect(etapaPendiente(-5, ['antes', 'dia'])).toBe('despues')
  })
  it('cada etapa tiene su tono', () => {
    const datos = { catalogo: CATALOGO, pantallasCliente: 1 }
    const antes = prepararRenovacion(fila({ duracionReal: '2026-11-21', estadoReal: 'ALERTA' }), datos)
    expect(antes.etapa).toBe('antes')
    expect(antes.mensaje).toContain('Te escribo rapidito: tu plan de')
    expect(antes.mensaje).toContain('vence en 3 días')

    const dia = prepararRenovacion(fila({ duracionReal: '2026-11-18' }), datos)
    expect(dia.etapa).toBe('dia')
    expect(dia.mensaje).toContain('Te aviso: tu plan de')
    expect(dia.mensaje).toContain('vence HOY (18-11-2026)')
    expect(dia.mensaje).toContain('Si renuevas hoy mismo')

    const despues = prepararRenovacion(fila({ duracionReal: '2026-11-15' }), datos)
    expect(despues.etapa).toBe('despues')
    expect(despues.mensaje).toContain('se venció el 15-11-2026 (hace 3 días)')
    expect(despues.mensaje).toContain('libero tu pantalla')
  })
  it('la etapa se puede forzar (p. ej. reenviar la del día)', () => {
    const r = prepararRenovacion(fila({ duracionReal: '2026-11-10' }), { catalogo: CATALOGO }, 'dia')
    expect(r.etapa).toBe('dia')
    expect(r.mensaje).toContain('se venció el 10-11-2026')
    expect(r.mensaje).toContain('Si renuevas hoy mismo')
  })
  it('prepararRenovacion nombra la cuenta cuando el cliente tiene varias', () => {
    const r = prepararRenovacion(fila(), { catalogo: CATALOGO, pantallasCliente: 3 })
    expect(r.identificarCuenta).toBe(true)
    expect(r.mensaje).toContain('*Xiomy 2*')
  })
})

import { mesesPorPlan, precioPorPlan, sumarMeses, inicioSugerido } from './renovacion'

describe('registrar renovación: sugerencias del formulario', () => {
  it('meses según el catálogo (y respaldo por familia)', () => {
    expect(mesesPorPlan('Plan Mensual', CATALOGO, 1)).toBe(1)
    expect(mesesPorPlan('Plan Semestral', CATALOGO, 1)).toBe(7)
    expect(mesesPorPlan('Plan Anual', CATALOGO, 2)).toBe(14)
    expect(mesesPorPlan('Plan Anual', [], 1)).toBe(14)
    expect(mesesPorPlan('3+1 Mundial', CATALOGO, 1)).toBe(null)
  })
  it('precio del catálogo según pantallas; si no, el último pago del mismo plan', () => {
    expect(precioPorPlan('Plan Mensual', CATALOGO, 1)).toBe(15000)
    expect(precioPorPlan('Plan Mensual', CATALOGO, 2)).toBe(25000)
    expect(precioPorPlan('Plan Semestral', CATALOGO, 3, { tipoPlan: 'Plan Semestral', precioVenta: 120000 })).toBe(120000)
    expect(precioPorPlan('3+1 Mundial', CATALOGO, 1, { tipoPlan: 'Plan Mensual', precioVenta: 15000 })).toBe(null)
  })
  it('fechas iguales a las del servidor', () => {
    expect(sumarMeses('2026-01-15', 1)).toBe('2026-02-15')
    expect(sumarMeses('2026-11-18', 14)).toBe('2028-01-18')
    expect(inicioSugerido('2026-11-23', '2026-11-18')).toBe('2026-11-23') // vigente
    expect(inicioSugerido('2026-11-10', '2026-11-18')).toBe('2026-11-10') // vencido: desde el vencimiento
    expect(inicioSugerido(null, '2026-11-18')).toBe('2026-11-18')        // sin fecha de fin
  })
})

import { datosPagoSugeridos } from './renovacion'
import { tipoFireDeSku } from '../../../config/equipos'

describe('datos del pago sugeridos (renovación)', () => {
  const ultimo = { sku: '0014K', tipoFire: 'Fire TV 4K', cortesia: 'NO', tipoPantalla: 'Final', pantallas: 1 }
  it('SKU, equipo y cortesía del último pago; Tipo Pantalla del Tipo Cliente', () => {
    expect(datosPagoSugeridos({ pantallas: 1 }, ultimo, 'Individual')).toEqual({
      sku: '0014K', tipoFire: 'Fire TV 4K', estado: 'Activo', cortesia: 'NO',
      pantallas: 1, itemQuantity: 1, tipoPantalla: 'Individual', cuentaDedicada: 'NO',
    })
  })
  it('sin Tipo Cliente usa el del último pago; 3 pantallas → cuenta dedicada SI', () => {
    const d = datosPagoSugeridos({ pantallas: 3 }, ultimo, null)
    expect(d.tipoPantalla).toBe('Final')
    expect(d.cuentaDedicada).toBe('SI')
  })
  it('sin pagos previos queda vacío lo que no se puede inferir', () => {
    const d = datosPagoSugeridos({ pantallas: 2 }, null, null)
    expect(d.sku).toBe('')
    expect(d.tipoFire).toBe('')
    expect(d.cortesia).toBe('NO')
    expect(d.cuentaDedicada).toBe('NO')
  })
  it('equipo según el SKU: fijo conocido o el último registrado', () => {
    expect(tipoFireDeSku('ONN4KO')).toBe('Watch ONN 4K Original')
    expect(tipoFireDeSku('0014K', { '0014K': 'Fire TV 4K' })).toBe('Fire TV 4K')
    expect(tipoFireDeSku('', {})).toBe('')
  })
})
