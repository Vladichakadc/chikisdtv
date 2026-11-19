import { X, Receipt, Clock, XCircle, Monitor, Wallet, Gift, DollarSign, MonitorCheck, Package, Pencil, MessageCircle, ListChecks, RefreshCcw, UserMinus } from 'lucide-react'
import { formatCurrency, formatDate } from '../../../utils/excelUtils'
import { Badge } from '../../../components/ui/Badge'
import { STAT_TONES } from './StatCard'
import { cn } from '../../../utils/cn'
import { etapaPendiente, ETAPAS_COBRO } from './renovacion'
import { diasLabel, diasLabelClass, estadoBadgeVariant, haceTexto } from './rowHelpers'

// ─── Tarjetas inteligentes: configuración de cada categoría accionable ──────
// Cada entrada describe cómo abrir su panel de detalle (título, tono visual,
// columna contextual de negocio) y qué tipo de venta sugerir al generarla en Pagos.
// Badge compartido por "alerta" y "vencido": fecha de vencimiento + días (vence en/venció hace)
function fechaDiasBadge(p) {
  const fecha = p.duracionReal || p.finalizacion
  return (
    <div className="flex flex-col items-start gap-0.5">
      {fecha && <span className="text-xs text-gray-500">{formatDate(fecha)}</span>}
      <span className={diasLabelClass(p._dias)}>{diasLabel(p._dias)}</span>
    </div>
  )
}

export const CATEGORY_CONFIG = {
  alerta: {
    title: 'Próximas a vencer', icon: Clock, tone: 'orange', tipoPago: 'Renovacion',
    extraLabel: 'Vencimiento',
    badge: fechaDiasBadge,
    emptyMsg: 'No hay pantallas próximas a vencer en este momento. ¡Todo al día!',
    hint: 'Contacta a estos clientes para anticipar la renovación antes del vencimiento.',
  },
  vencido: {
    title: 'Cuentas vencidas', icon: XCircle, tone: 'red', tipoPago: 'Renovacion',
    extraLabel: 'Vencimiento',
    badge: fechaDiasBadge,
    emptyMsg: 'No hay cuentas vencidas. ¡Excelente gestión de cartera!',
    hint: 'Prioriza estos clientes: cada día vencido es ingreso represado e incrementa el riesgo de fuga.',
  },
  libre: {
    title: 'Pantallas sin asignar', icon: Monitor, tone: 'orange', tipoPago: 'Activacion Pantalla',
    extraLabel: 'Días / Estado',
    badge: (p) => (
      <div className="flex flex-col items-start gap-1">
        <span className={diasLabelClass(p._dias)}>{diasLabel(p._dias)}</span>
        {(p.estadoReal || p.estado) && (
          <Badge variant={estadoBadgeVariant(p.estadoReal || p.estado)}>{p.estadoReal || p.estado}</Badge>
        )}
      </div>
    ),
    emptyMsg: 'No hay pantallas libres en este momento — ocupación al máximo.',
    hint: 'Inventario disponible para vender: asigna un nuevo titular editando la pantalla.',
  },
  debe: {
    title: 'Cuentas que deben', icon: Wallet, tone: 'amber', tipoPago: 'Renovacion',
    extraLabel: 'Monto adeudado',
    badge: (p) => (
      <div className="flex flex-col items-start gap-0.5">
        {!(p.montoDebe > 0) && !(p.montoDebeUSD > 0) && <span className="font-semibold text-amber-700">{formatCurrency(0)}</span>}
        {p.montoDebe > 0 && <span className="font-semibold text-amber-700">{formatCurrency(p.montoDebe)}</span>}
        {p.montoDebeUSD > 0 && <span className="font-semibold text-emerald-700">US${Number(p.montoDebeUSD).toLocaleString('en-US')}</span>}
      </div>
    ),
    emptyMsg: 'No hay cuentas con saldo pendiente — cartera de cobro al día.',
    hint: 'Gestiona el cobro y registra el pago como venta en cuanto el cliente regularice su saldo.',
  },
  cortesia: {
    title: 'Cortesías activas', icon: Gift, tone: 'purple', tipoPago: 'Renovacion',
    extraLabel: 'Vigencia',
    badge: (p) => <span className={diasLabelClass(p._dias)}>{diasLabel(p._dias)}</span>,
    emptyMsg: 'No hay cortesías activas registradas.',
    hint: 'Evalúa convertir estas cortesías en clientes de pago al finalizar su vigencia.',
  },
}

// Construye los datos con los que se abrirá "Nueva Venta" en Pagos a partir de una pantalla
export function screenToVentaPrefill(screen, catKey) {
  return {
    customerId: screen.customerId || '',
    nombre:     screen.nombre || '',
    apellido:   screen.apellido || '',
    nickname:   screen.nickname || '',
    idPantalla: screen.idPantalla || '',
    cuentaId:   screen.cuentaId || '',
    cuenta:     screen.cuenta || '',
    pantallas:  screen.pantallas || '',
    tipoPago:   CATEGORY_CONFIG[catKey]?.tipoPago || '',
    cortesia:   catKey === 'cortesia' ? 'SI' : '',
  }
}

// Panel de detalle accionable: lista las pantallas/clientes de una categoría y permite
// generar la venta correspondiente directamente desde Pagos, ya pre-cargada.
// Categorías en las que tiene sentido enviar el recordatorio de pago por
// WhatsApp (abre el mismo ComprobanteModal del panel Estatus Cliente, que
// en VENCIDO/ALERTA arranca en la vista "Renovación" con el mensaje listo).
const CATEGORIAS_RECORDATORIO = new Set(['vencido', 'alerta'])

export function CategoryPanel({ catKey, screens, onClose, onGenerate, onEdit, onStatus, recordatorios, onRecordarTodos, onRenovar, onBaja }) {
  const config = CATEGORY_CONFIG[catKey]
  const conRecordatorio = CATEGORIAS_RECORDATORIO.has(catKey) && !!onStatus
  // Vencidas / Próx. a vencer: "Renovar" registra venta + nuevo plan en un paso
  const conRenovar = CATEGORIAS_RECORDATORIO.has(catKey) && !!onRenovar
  // Secuencia de cobro: qué etapa le toca hoy a cada pantalla (null = al día)
  const pendienteDe = (p) => (p.nickname
    ? etapaPendiente(p._dias, recordatorios?.ultimos?.[p.idPantalla]?.etapas || [])
    : null)
  const totalPendientes = conRecordatorio ? screens.filter(pendienteDe).length : 0
  if (!config) return null
  // Bloques compartidos por la tabla (escritorio) y las tarjetas (móvil)
  const nombreCliente = (p) => [p.nombre, p.apellido].filter(Boolean).join(' ').trim() || p.nickname || '— Sin asignar —'
  const infoCliente = (p) => {
    const cliente = nombreCliente(p)
    return (
      <>
    <p className="font-medium text-gray-800">{cliente}</p>
    {p.nickname && p.nickname !== cliente && <p className="text-xs text-gray-400">{p.nickname}</p>}
    {conRecordatorio && p.nickname && (() => {
      const pend = pendienteDe(p)
      return pend
        ? <span className="mt-0.5 mr-1 inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800" title={`Secuencia de cobro: toca enviar "${ETAPAS_COBRO[pend].label}"`}>Toca: {ETAPAS_COBRO[pend].orden}. {ETAPAS_COBRO[pend].corto}</span>
        : <span className="mt-0.5 mr-1 inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700" title="La etapa de cobro de hoy ya se envió">Secuencia al día</span>
    })()}
    {conRecordatorio && recordatorios?.ultimos?.[p.idPantalla] && (() => {
      const u = recordatorios.ultimos[p.idPantalla]
      return (
        <span
          className={cn(
            'mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
            u.renovo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
          )}
          title={`${u.total} recordatorio(s) en los últimos ${recordatorios.dias} días · último por ${u.canal === 'whatsapp' ? 'WhatsApp' : 'mensaje copiado'}`}
        >
          <MessageCircle size={10} /> Recordado {haceTexto(u.fecha)}{u.total > 1 ? ` · ${u.total}×` : ''}{u.renovo ? ' · renovó' : ''}
        </span>
      )
    })()}
      </>
    )
  }
  const acciones = (p, movil = false) => {
    const cliente = nombreCliente(p)
    return (
    <div className={cn("flex items-center gap-1.5", movil ? "flex-wrap [&>button]:min-h-[40px] [&>button]:px-3" : "justify-end")}>
      {/* "libre" ya usa "Asignar Pantalla" para abrir Editar Pantalla; el resto
          de categorías (Vencidas, Próx. a vencer, Deben, Cortesías) gana un
          acceso directo al formulario sin pasar por la tabla principal. */}
      {catKey !== 'libre' && onEdit && (
        <button
          onClick={() => onEdit(p)}
          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-brand-primary hover:border-brand-primary hover:bg-orange-50 transition-colors"
          title="Editar pantalla"
        >
          <Pencil size={13} />
        </button>
      )}
      {conRecordatorio && (
        <button
          onClick={() => onStatus(p)}
          disabled={!p.nickname}
          aria-label={`Status cliente — recordatorio de pago por WhatsApp para ${cliente}`}
          title={p.nickname
            ? 'Status cliente — enviar recordatorio de pago por WhatsApp'
            : 'Sin nickname — no se puede generar el recordatorio'}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
            p.nickname
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300'
              : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
          )}
        >
          <MessageCircle size={13} /> Status cliente
        </button>
      )}
      {catKey !== 'libre' && onBaja && p.nickname && (
        <button
          onClick={() => onBaja(p)}
          aria-label={`Dar de baja ${cliente}`}
          title="Dar de baja — registra la baja y deja la pantalla Libre"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 text-xs font-semibold transition-colors"
        >
          <UserMinus size={13} /> Dar de baja
        </button>
      )}
      {conRenovar ? (
        <button
          onClick={() => onRenovar(p)}
          disabled={!p.nickname}
          title={p.nickname ? 'Registra la venta y extiende el plan en un solo paso' : 'Sin titular: asigna la pantalla antes de renovar'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-40"
        >
          <RefreshCcw size={13} /> Renovar
        </button>
      ) : (
        <button
          onClick={() => onGenerate(p, catKey)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-dark text-white text-xs font-semibold shadow-sm transition-colors"
        >
          {catKey === 'libre'
            ? <><MonitorCheck size={13} /> Asignar Pantalla</>
            : <><Receipt size={13} /> Generar venta</>}
        </button>
      )}
    </div>
    )
  }

  const t = STAT_TONES[config.tone] || STAT_TONES.orange
  const Icon = config.icon
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4">
        {/* STAT_TONES solo trae colores (from/to): el degradado va en style;
            con clases inexistentes la cabecera quedaba blanca y el título invisible */}
        <div className="rounded-t-2xl px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3" style={{ background: `linear-gradient(90deg, ${t.from}, ${t.to})` }}>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2.5"><Icon size={22} className="text-white" /></div>
            <div>
              <h2 className="text-xl font-bold text-white">{config.title}</h2>
              <p className="text-white/80 text-sm">{screens.length} {screens.length === 1 ? 'registro encontrado' : 'registros encontrados'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {conRecordatorio && onRecordarTodos && screens.length > 0 && (
              <button
                onClick={() => onRecordarTodos(screens)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-xs font-bold text-slate-800 shadow-sm transition-colors"
                title="Abre el mensaje de cada cliente, uno tras otro, con la etapa de cobro que le toca"
              >
                <ListChecks size={14} /> Recordar a todos{totalPendientes ? ` (${totalPendientes} hoy)` : ''}
              </button>
            )}
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors" aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 text-xs border-b text-slate-700" style={{ background: `${t.from}14`, borderColor: `${t.from}33` }}>
          💡 {config.hint}
          {conRecordatorio && recordatorios?.efectividad?.pantallas > 0 && (
            <p className="mt-1 font-semibold">
              📊 Últimos {recordatorios.dias} días: {recordatorios.efectividad.pantallas} pantalla{recordatorios.efectividad.pantallas === 1 ? '' : 's'} recordada{recordatorios.efectividad.pantallas === 1 ? '' : 's'} · {recordatorios.efectividad.renovaron} renovaron ({recordatorios.efectividad.tasa}%)
            </p>
          )}
        </div>

        {screens.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400">
            <Icon size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{config.emptyMsg}</p>
          </div>
        ) : (
          <div className="max-h-[62vh] sm:max-h-[50vh] overflow-y-auto">
            {/* Escritorio / tablet: tabla */}
            <table className="w-full text-sm hidden sm:table">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2.5">Cliente</th>
                  <th className="px-4 py-2.5">Pantalla</th>
                  <th className="px-4 py-2.5">Cuenta</th>
                  <th className="px-4 py-2.5">{config.extraLabel}</th>
                  <th className="px-4 py-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {screens.map(p => (
                  <tr key={p.idPantalla} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">{infoCliente(p)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{p.idPantalla}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{p.cuenta || p.cuentaId || '—'}</td>
                    <td className="px-4 py-2.5">{config.badge(p)}</td>
                    <td className="px-4 py-2.5 text-right">{acciones(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Móvil: tarjetas con las acciones a la vista (en la tabla quedaban
                fuera de la pantalla, a la derecha) */}
            <ul className="sm:hidden divide-y divide-gray-100">
              {screens.map(p => (
                <li key={p.idPantalla} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">{infoCliente(p)}</div>
                    <div className="shrink-0 text-right">{config.badge(p)}</div>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    <span className="font-mono">{p.idPantalla}</span> · {p.cuenta || p.cuentaId || '—'}
                  </p>
                  <div className="mt-2">{acciones(p, true)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="px-4 sm:px-6 py-3 border-t border-gray-100 flex items-center justify-end sm:justify-between gap-3">
          <p className="hidden sm:block text-xs text-gray-400">
            {catKey === 'libre'
              ? '"Asignar Pantalla" abre el formulario de edición de la pantalla para asignarle un nuevo titular.'
              : conRecordatorio
                ? (conRenovar
                    ? 'El lápiz abre Editar Pantalla; "Status cliente" prepara el recordatorio por WhatsApp; "Renovar" registra la venta y extiende el plan en un paso.'
                    : 'El lápiz abre Editar Pantalla; "Status cliente" prepara el recordatorio de pago por WhatsApp; "Generar venta" abre Pagos con los datos ya cargados.')
                : 'El lápiz abre Editar Pantalla directamente; "Generar venta" abre Pagos con los datos ya cargados.'}
          </p>
          <button onClick={onClose} className="shrink-0 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
