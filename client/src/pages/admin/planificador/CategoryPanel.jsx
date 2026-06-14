import { X, Receipt, Clock, XCircle, Monitor, Wallet, Gift, DollarSign, MonitorCheck } from 'lucide-react'
import { formatCurrency, formatDate } from '../../../utils/excelUtils'
import { Badge } from '../../../components/ui/Badge'
import { STAT_TONES } from './StatCard'
import { diasLabel, diasLabelClass, estadoBadgeVariant } from './rowHelpers'

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
    badge: (p) => <span className="font-semibold text-amber-700">{formatCurrency(p.montoDebe || 0)}</span>,
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
  credito: {
    title: 'Crédito en cartera', icon: DollarSign, tone: 'emerald', tipoPago: 'Renovacion',
    extraLabel: 'Saldo a favor',
    badge: (p) => <span className="font-semibold text-emerald-700">{formatCurrency(p.credito || 0)}</span>,
    emptyMsg: 'No hay saldo de crédito acumulado en las cuentas.',
    hint: 'Aplica este saldo a favor como abono en la próxima venta/renovación de cada cuenta.',
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
export function CategoryPanel({ catKey, screens, onClose, onGenerate }) {
  const config = CATEGORY_CONFIG[catKey]
  if (!config) return null
  const t = STAT_TONES[config.tone] || STAT_TONES.orange
  const Icon = config.icon
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4">
        <div className={`bg-gradient-to-r ${t.solid} rounded-t-2xl px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2.5"><Icon size={22} className="text-white" /></div>
            <div>
              <h2 className="text-xl font-bold text-white">{config.title}</h2>
              <p className="text-white/80 text-sm">{screens.length} {screens.length === 1 ? 'registro encontrado' : 'registros encontrados'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className={`px-6 py-3 text-xs border-b ${t.outline} border-x-0 border-t-0`}>
          💡 {config.hint}
        </div>

        {screens.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400">
            <Icon size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{config.emptyMsg}</p>
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto">
            <table className="w-full text-sm">
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
                {screens.map(p => {
                  const cliente = [p.nombre, p.apellido].filter(Boolean).join(' ').trim() || p.nickname || '— Sin asignar —'
                  return (
                    <tr key={p.idPantalla} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-800">{cliente}</p>
                        {p.nickname && p.nickname !== cliente && <p className="text-xs text-gray-400">{p.nickname}</p>}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{p.idPantalla}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{p.cuenta || p.cuentaId || '—'}</td>
                      <td className="px-4 py-2.5">{config.badge(p)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => onGenerate(p, catKey)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-dark text-white text-xs font-semibold shadow-sm transition-colors"
                        >
                          {catKey === 'libre'
                            ? <><MonitorCheck size={13} /> Asignar Pantalla</>
                            : <><Receipt size={13} /> Generar venta</>}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            {catKey === 'libre'
              ? '"Asignar Pantalla" abre el formulario de edición de la pantalla para asignarle un nuevo titular.'
              : '"Generar venta" abre el formulario en Pagos con los datos del cliente y la pantalla ya cargados.'}
          </p>
          <button onClick={onClose} className="shrink-0 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
