import { useEffect, useState } from 'react'
import { Download, RefreshCw, Upload, ChevronRight } from 'lucide-react'
import { formatCurrency } from '../../../utils/excelUtils'
import { cn } from '../../../utils/cn'

// "Hoy al aire": la cabecera del Dashboard es la pauta del día de un canal de
// TV — lo que hay que atender hoy, en orden de urgencia, con su acceso directo.

export const DASH_TIPOS = `
  .dash-num { font-family: 'Barlow Condensed', 'Barlow', system-ui, sans-serif; font-variant-numeric: tabular-nums; letter-spacing: -0.01em }
  .dash-txt { font-family: 'Barlow', system-ui, sans-serif }
  @keyframes dash-rec { 0%, 100% { opacity: 1 } 50% { opacity: .25 } }
  .dash-rec { animation: dash-rec 1.6s ease-in-out infinite }
  @media (prefers-reduced-motion: reduce) { .dash-rec { animation: none } }
`

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

function useReloj() {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30000)
    return () => clearInterval(t)
  }, [])
  return ahora
}

// Una línea de la pauta: cifra grande, qué es y a dónde lleva
function Segmento({ valor, titulo, detalle, tono, onClick, accion }) {
  const color = {
    rojo: 'text-[#ff6b5e]', ambar: 'text-amber-300', naranja: 'text-[#ff9a4d]', verde: 'text-emerald-300', neutro: 'text-white',
  }[tono]
  return (
    <button type="button" onClick={onClick}
      className="group text-left flex sm:flex-col items-center sm:items-start gap-4 sm:gap-1 px-5 py-4 sm:py-5 hover:bg-white/[.06] focus-visible:bg-white/[.08] focus-visible:outline-none transition-colors min-w-0">
      <span className={cn('dash-num text-[2.4rem] sm:text-5xl font-bold leading-none w-[4.6rem] sm:w-auto flex-shrink-0', color)}>{valor}</span>
      <span className="min-w-0 flex-1">
        <span className="dash-txt block text-[15px] font-semibold text-white leading-snug">{titulo}</span>
        <span className="dash-txt block text-[13px] text-slate-300/80 leading-snug mt-0.5">{detalle}</span>
        <span className="dash-txt hidden sm:inline-flex items-center gap-0.5 text-[13px] font-semibold text-[#ff9a4d] mt-2 group-hover:gap-1.5 transition-all">
          {accion} <ChevronRight size={14} />
        </span>
      </span>
      <ChevronRight size={18} className="sm:hidden text-slate-500 flex-shrink-0" />
    </button>
  )
}

export function AlAire({ operacion, stats, valorEnRiesgo, onAbrir, acciones }) {
  const ahora = useReloj()
  const v = operacion?.vencidas ?? { pantallas: 0, clientes: 0, venceHoy: 0 }
  const p = operacion?.porVencer ?? { pantallas: 0, clientes: 0 }
  const cap = operacion?.capacidad ?? { libres: 0, pctOcupacion: 0 }
  const deudaCOP = stats?.montoDeudaTotal ?? 0
  const deudaUSD = stats?.montoDeudaUSD ?? 0
  const clientesDeuda = stats?.clientesConDeuda ?? 0
  const fecha = ahora.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  const hora = ahora.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })

  return (
    <section aria-labelledby="al-aire-titulo" className="rounded-[28px] overflow-hidden text-white mb-6"
      style={{ background: 'radial-gradient(120% 140% at 0% 0%, #1f2563 0%, #12163a 55%, #0d1030 100%)' }}>
      {/* Barra superior: identidad + reloj + herramientas */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-white/10">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="dash-rec inline-block w-2.5 h-2.5 rounded-full bg-[#ff3b30] shadow-[0_0_12px_#ff3b30]" aria-hidden="true" />
            <h1 id="al-aire-titulo" className="dash-num text-[28px] sm:text-[34px] font-bold leading-none">Hoy al aire</h1>
          </div>
          <p className="dash-txt text-sm text-slate-300/80 mt-1.5 first-letter:uppercase">{fecha} · {hora}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">{acciones}</div>
      </div>

      {/* Pauta del día */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 divide-white/10 lg:divide-x [&>*]:border-white/10 sm:[&>*:nth-child(n+3)]:border-t lg:[&>*:nth-child(n+3)]:border-t-0">
        <Segmento
          valor={v.venceHoy} tono={v.venceHoy ? 'rojo' : 'neutro'}
          titulo={v.venceHoy === 1 ? 'Pantalla vence hoy' : 'Pantallas vencen hoy'}
          detalle={v.venceHoy ? 'Escríbeles antes del corte de la señal' : 'Nadie vence hoy'}
          accion="Ver y renovar" onClick={() => onAbrir('vencido')}
        />
        <Segmento
          valor={v.clientes} tono={v.clientes ? 'rojo' : 'verde'}
          titulo="Clientes vencidos sin renovar"
          detalle={v.clientes ? `${plural(v.pantallas, 'pantalla', 'pantallas')} esperando renovación` : 'Cartera al día'}
          accion="Enviar recordatorios" onClick={() => onAbrir('vencido')}
        />
        <Segmento
          valor={p.clientes} tono={p.clientes ? 'ambar' : 'neutro'}
          titulo={`Vencen en ${operacion?.diasAlerta ?? 8} días`}
          detalle={p.clientes ? `${plural(p.pantallas, 'pantalla', 'pantallas')} para renovar a tiempo` : 'Sin vencimientos cercanos'}
          accion="Anticipar renovación" onClick={() => onAbrir('alerta')}
        />
        <Segmento
          valor={clientesDeuda} tono={clientesDeuda ? 'naranja' : 'neutro'}
          titulo="Por cobrar"
          detalle={clientesDeuda
            ? [deudaCOP > 0 || !deudaUSD ? formatCurrency(deudaCOP) : null, deudaUSD > 0 ? `US$${Number(deudaUSD).toLocaleString('en-US')}` : null].filter(Boolean).join(' + ')
            : 'Nadie tiene saldo pendiente'}
          accion="Ver deudores" onClick={() => onAbrir('deuda')}
        />
        <Segmento
          valor={cap.libres} tono={cap.libres <= 3 ? 'naranja' : 'verde'}
          titulo={cap.libres === 1 ? 'Cupo libre para vender' : 'Cupos libres para vender'}
          detalle={`Ocupación al ${cap.pctOcupacion}%${cap.libres <= 3 ? ' · compra otra cuenta padre' : ''}`}
          accion="Ver capacidad" onClick={() => onAbrir('libres')}
        />
      </div>

      {valorEnRiesgo > 0 && (
        <p className="dash-txt px-5 sm:px-6 py-3 text-[13px] text-slate-300/80 border-t border-white/10 bg-black/10">
          Lo que han pagado históricamente los clientes vencidos o por vencer: <span className="dash-num text-base font-semibold text-white">{formatCurrency(valorEnRiesgo)}</span>. Es lo que está en juego si no renuevan.
        </p>
      )}
    </section>
  )
}

// Botón de la barra de herramientas sobre fondo oscuro
export function BotonAire({ icon: Icon, children, primario, className, ...props }) {
  return (
    <button type="button" {...props}
      className={cn('dash-txt min-h-[40px] px-4 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60',
        primario ? 'bg-brand-primary hover:bg-orange-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
        className)}>
      {Icon && <Icon size={15} />} {children}
    </button>
  )
}

