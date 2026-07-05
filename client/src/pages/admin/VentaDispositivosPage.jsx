/**
 * VentaDispositivosPage — Inventario Equipos
 * Skills applied: ui-ux-pro-max · huashu-design · taste-skill
 *
 * Misma interfaz profesional de SubscriptionsPage:
 *  – Hero header oscuro con orbs de luz ambiental
 *  – KPI cards con gradientes y animaciones de entrada
 *  – Drawer lateral en lugar de modal centrado
 *  – Confirm dialog branded
 *  – Skeleton shimmer loader
 *  – Búsqueda + contador en tiempo real
 *  – Tabla con scroll horizontal y acciones hover
 */

import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { todayStr } from '../../utils/dateUtils'
import {
  Search, Plus, Pencil, Trash2, X,
  DollarSign, ShoppingCart, Tv, RotateCcw,
  ChevronUp, ChevronDown, ChevronsUpDown,
  AlertTriangle, Package, Activity, TrendingUp,
  Shield, ShieldOff, CheckCircle2, XCircle,
} from 'lucide-react'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { KpiCard } from '../../components/ui/KpiCard'
import { formatDate, formatCurrency } from '../../utils/excelUtils'

/* ══════════════════════════════════════════════════════════════
   DESIGN TOKENS (Huashu — brand violet/indigo para equipos)
══════════════════════════════════════════════════════════════ */
const CSS = `
  @keyframes iv-fade-up  { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes iv-fade-in  { from { opacity:0 } to { opacity:1 } }
  @keyframes iv-scale-in { from { opacity:0; transform:scale(.94) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
  @keyframes iv-slide-in { from { opacity:0; transform:translateX(100%) } to { opacity:1; transform:translateX(0) } }
  @keyframes iv-shimmer  { from { background-position:-200% 0 } to { background-position:200% 0 } }
  @keyframes iv-orb-1    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes iv-orb-2    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }

  .iv-a1 { animation: iv-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .iv-a2 { animation: iv-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .iv-a3 { animation: iv-fade-up .45s cubic-bezier(.22,1,.36,1) .12s both }
  .iv-a4 { animation: iv-fade-up .45s cubic-bezier(.22,1,.36,1) .18s both }
  .iv-a5 { animation: iv-fade-up .45s cubic-bezier(.22,1,.36,1) .24s both }

  .iv-skeleton {
    background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
    background-size: 200% 100%;
    animation: iv-shimmer 1.6s infinite;
    border-radius: 6px;
  }
  .iv-drawer  { animation: iv-slide-in .3s cubic-bezier(.22,1,.36,1) both }
  .iv-overlay { animation: iv-fade-in .2s ease both }
  .iv-confirm { animation: iv-scale-in .22s cubic-bezier(.22,1,.36,1) both }

  .iv-kpi { transition: transform .25s ease, box-shadow .25s ease }
  .iv-kpi:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.12) }
  .iv-kpi.clickable { cursor: pointer }

  .iv-cta {
    background: linear-gradient(135deg,#6366f1,#7c3aed);
    box-shadow: 0 4px 18px rgba(99,102,241,.4);
    transition: all .22s ease;
  }
  .iv-cta:hover  { box-shadow: 0 7px 24px rgba(99,102,241,.55); transform: translateY(-2px) }
  .iv-cta:active { transform: translateY(0) }

  .iv-btn-ghost {
    transition: all .2s ease;
    border: 1px solid rgba(255,255,255,.2);
  }
  .iv-btn-ghost:hover { background: rgba(255,255,255,.1) }

  .iv-btn-danger {
    background: linear-gradient(135deg,#ef4444,#f87171);
    box-shadow: 0 4px 14px rgba(239,68,68,.3);
    transition: all .2s ease;
  }
  .iv-btn-danger:hover { box-shadow: 0 6px 20px rgba(239,68,68,.45); transform: translateY(-1px) }

  .iv-orb-1 { animation: iv-orb-1 8s ease-in-out infinite }
  .iv-orb-2 { animation: iv-orb-2 11s ease-in-out infinite }

  .iv-search:focus { outline: none; box-shadow: 0 0 0 3px rgba(99,102,241,.18) }

  .iv-row { transition: background .15s ease }
  .iv-row:hover td { background: rgba(99,102,241,.04) }

  .iv-th-sort { transition: background .15s ease }
  .iv-th-sort:hover { background: rgba(255,255,255,.12) }

  .iv-action-btn { transition: all .18s ease; opacity: 0 }
  tr:hover .iv-action-btn { opacity: 1 }
  .iv-action-btn:hover { transform: scale(1.15) }

  @media (prefers-reduced-motion: reduce) {
    .iv-a1,.iv-a2,.iv-a3,.iv-a4,.iv-a5,
    .iv-drawer,.iv-overlay,.iv-confirm,
    .iv-orb-1,.iv-orb-2,.iv-skeleton { animation: none !important; transition: none !important }
  }
`

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════ */
const COLS = [
  { key: 'idVM',        label: 'ID Venta'   },
  { key: 'customerId',  label: 'ID Cliente' },
  { key: 'nombre',      label: 'Nombre'     },
  { key: 'apellido',    label: 'Apellido'   },
  { key: 'sku',         label: 'SKU'        },
  { key: 'tipoFire',    label: 'Dispositivo'},
  { key: 'serial',      label: 'Serial'     },
  { key: 'idPantalla',  label: 'Pantalla'   },
  { key: 'nickname',    label: 'Nickname'   },
  { key: 'estado',      label: 'Estado'     },
  { key: 'garantia',    label: 'Garantía'   },
  { key: 'fecha',       label: 'Fecha'      },
  { key: 'precioVenta', label: 'Precio'     },
  { key: 'costo',       label: 'Costo'      },
  { key: 'medioPago',   label: 'Medio Pago' },
]

const MEDIOS_PAGO = [
  'Efectivo','Nequi','Daviplata','Transfiya','PSE','Bancolombia',
  'Banco de Bogotá','Davivienda','BBVA Colombia','Banco de Occidente',
  'Banco Popular','Banco AV Villas','Banco Caja Social','Scotiabank Colpatria',
  'Itaú Colombia','Banco Agrario','Banco Falabella','Banco Pichincha',
  'Banco GNB Sudameris','Bancoomeva','Banco Finandina','Banco Serfinanza',
  'Banco W','Lulo Bank','Nu Colombia','RappiPay','Movii','Otro',
]

const SKU_TIPO_FIRE = {
  ONN4KCH: 'Watch ONN 4K china',
  ONN4KO:  'Watch ONN 4K Original',
  ONNHDO:  'Watch ONN HD Original',
}

const EMPTY = {
  idVM: '', customerId: '', nombre: '', apellido: '',
  sku: '', tipoFire: '', idPantalla: '', nickname: '',
  serial: '', cuentaId: '', cuenta: '', estado: 'Activo',
  cortesia: 'NO', pantallas: 1, fechaAlta: '', fecha: '',
  anio: '', mes: '', precioVenta: '', costo: '', medioPago: '',
  itemQuantity: 1, tipoPago: 'Venta', tipoPlan: '',
  tipoPantalla: '', cuentaDedicada: 'NO',
}

const fmtCOP = (v) => (v == null || v === '' ? '—' : formatCurrency(v))

function computeGarantia(fecha) {
  if (!fecha) return 'NO'
  const f = new Date(fecha)
  if (isNaN(f.getTime())) return 'NO'
  const limite = new Date()
  limite.setFullYear(limite.getFullYear() - 1)
  return f >= limite ? 'SI' : 'NO'
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════ */


function SortIcon({ colKey, sortCol, sortDir }) {
  if (sortCol !== colKey) return <ChevronsUpDown size={12} className="opacity-30 shrink-0" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="shrink-0 text-indigo-200" />
    : <ChevronDown size={12} className="shrink-0 text-indigo-200" />
}

/** Skeleton table */
function SkeletonTable() {
  return (
    <div className="divide-y divide-slate-100">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-3.5 animate-pulse">
          <div className="iv-skeleton w-16 h-3.5 rounded" />
          <div className="iv-skeleton w-20 h-3.5 rounded" />
          <div className="iv-skeleton w-24 h-3.5 rounded" />
          <div className="flex-1 iv-skeleton h-3.5 rounded" />
          <div className="iv-skeleton w-20 h-3.5 rounded hidden md:block" />
          <div className="iv-skeleton w-14 h-5 rounded-full hidden lg:block" />
          <div className="iv-skeleton w-20 h-3.5 rounded hidden xl:block" />
        </div>
      ))}
    </div>
  )
}

/** Empty state */
function EmptyState({ onNew }) {
  return (
    <div className="py-20 flex flex-col items-center gap-5 text-center px-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-50
                        flex items-center justify-center shadow-inner">
          <Package size={36} className="text-indigo-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-indigo-500
                        flex items-center justify-center shadow-md">
          <Plus size={14} className="text-white" />
        </div>
      </div>
      <div className="max-w-xs">
        <p className="text-lg font-semibold text-slate-700">Sin registros</p>
        <p className="text-slate-400 text-sm mt-1.5">No se encontraron equipos con los filtros actuales.</p>
      </div>
      <button onClick={onNew} data-testid="empty-new-btn"
        className="iv-cta px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2">
        <Plus size={15} /> Nueva Venta de Equipo
      </button>
    </div>
  )
}

/** Confirm delete dialog */
function ConfirmDialog({ idVM, onConfirm, onCancel }) {
  return (
    <div className="iv-overlay fixed inset-0 bg-black/50 backdrop-blur-[3px] flex items-center
                    justify-center z-[70] p-4" onClick={onCancel}>
      <div className="iv-confirm bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
           onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex gap-4 items-start">
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">¿Eliminar equipo?</h3>
              <p className="text-slate-500 text-sm mt-0.5">Se eliminará la venta <strong className="text-slate-700 font-mono">{idVM}</strong>.</p>
              <p className="text-slate-400 text-xs mt-1">Esta acción es permanente y no se puede deshacer.</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200
                       rounded-xl hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} data-testid="confirm-delete-btn"
            className="iv-btn-danger px-4 py-2 text-sm font-semibold text-white rounded-xl">
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

/** Form field label */
function FieldLabel({ children }) {
  return <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{children}</label>
}

const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
const selectCls = inputCls

/** Section header inside drawer */
function DrawerSection({ children }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[10px] font-bold tracking-[.14em] uppercase text-slate-400">{children}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

/** Slide-in drawer form */
function EquipoDrawer({
  editing, form, setForm, f,
  skuOptions, medioPagoOptions, clienteOptions, pantallaOptions,
  pickCliente, pickPantalla,
  onSubmit, onClose
}) {
  const [saving, setSaving] = useState(false)
  const submit = async (e) => { e.preventDefault(); setSaving(true); await onSubmit(e); setSaving(false) }
  const garantia = computeGarantia(form.fecha)

  return (
    <>
      <div className="iv-overlay fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50" onClick={onClose} />
      <div className="iv-drawer fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="absolute top-0 left-0 right-0 h-[3px]"
               style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa)' }} />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[.14em] uppercase text-indigo-500 mb-0.5">
                {editing ? 'Editar registro' : 'Nuevo registro'}
              </p>
              <h2 className="text-xl font-bold text-slate-800"
                  style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {editing ? 'Editar Equipo' : 'Nueva Venta de Equipo'}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {editing ? `Editando ${editing.idVM}` : 'Complete todos los campos requeridos.'}
              </p>
            </div>
            <button onClick={onClose} data-testid="drawer-close-btn"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all mt-0.5">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Identificación */}
            <DrawerSection>Identificación</DrawerSection>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>ID Venta</FieldLabel>
                <input value={form.idVM} disabled
                  className="w-full px-3 py-2.5 border border-slate-100 rounded-xl bg-slate-50 text-slate-400 text-sm font-mono" />
              </div>
              <div>
                <FieldLabel>Cliente</FieldLabel>
                <select value={form.customerId} onChange={(e) => pickCliente(e.target.value)} className={selectCls}>
                  <option value="">Seleccionar cliente…</option>
                  {form.customerId && !clienteOptions.some(c => String(c.customerId) === String(form.customerId)) && (
                    <option value={form.customerId}>{form.customerId} · {form.nombre || 'cliente'}</option>
                  )}
                  {clienteOptions.map(c => (
                    <option key={c.customerId} value={c.customerId}>
                      {c.customerId} · {[c.nombre, c.apellido].filter(Boolean).join(' ') || '—'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Nombre</FieldLabel>
                <input value={form.nombre} onChange={f('nombre')} className={inputCls} />
              </div>
              <div>
                <FieldLabel>Apellido</FieldLabel>
                <input value={form.apellido} onChange={f('apellido')} className={inputCls} />
              </div>
            </div>

            {/* Dispositivo */}
            <DrawerSection>Dispositivo físico</DrawerSection>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <FieldLabel>Tipo de Dispositivo</FieldLabel>
                <select value={form.tipoFire} onChange={f('tipoFire')} className={selectCls}>
                  <option value="">Seleccionar equipo…</option>
                  {form.tipoFire && !['FireTV Stick','FireTV Stick 4K','FireTV Stick 4K Max','FireTV Cube','FireTV TV',
                    'Watch ONN 4K Original','Watch ONN 4K China','Watch ONN HD Original',
                    'Smart TV (Android/Google)','Smart TV (Samsung/LG/Roku)','PC / Web','Celular / Tablet','Otro',
                  ].includes(form.tipoFire) && <option value={form.tipoFire}>{form.tipoFire} (actual)</option>}
                  <option>FireTV Stick</option>
                  <option>FireTV Stick 4K</option>
                  <option>FireTV Stick 4K Max</option>
                  <option>FireTV Cube</option>
                  <option>FireTV TV</option>
                  <option>Watch ONN 4K Original</option>
                  <option>Watch ONN 4K China</option>
                  <option>Watch ONN HD Original</option>
                  <option>Smart TV (Android/Google)</option>
                  <option>Smart TV (Samsung/LG/Roku)</option>
                  <option>PC / Web</option>
                  <option>Celular / Tablet</option>
                  <option>Otro</option>
                </select>
              </div>
              <div>
                <FieldLabel>SKU</FieldLabel>
                <select value={form.sku} onChange={f('sku')} className={`${selectCls} font-mono`}>
                  <option value="">Seleccionar SKU…</option>
                  {form.sku && !skuOptions.includes(form.sku) && <option value={form.sku}>{form.sku}</option>}
                  {skuOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Serial del equipo</FieldLabel>
                <input value={form.serial || ''} onChange={f('serial')} placeholder="Serial físico"
                  className={`${inputCls} font-mono`} />
              </div>

              {/* Garantía visual pill */}
              <div>
                <FieldLabel>Garantía (automática)</FieldLabel>
                <div className="flex items-center gap-2 px-3 py-2.5 border border-slate-100 rounded-xl bg-slate-50">
                  {garantia === 'SI'
                    ? <><Shield size={14} className="text-emerald-500 shrink-0" /><span className="text-xs font-semibold text-emerald-700">Vigente</span></>
                    : <><ShieldOff size={14} className="text-slate-400 shrink-0" /><span className="text-xs font-semibold text-slate-400">Sin garantía</span></>}
                  <span className="text-xs text-slate-400 ml-auto">1 año</span>
                </div>
              </div>

              <div>
                <FieldLabel>Estado</FieldLabel>
                <select value={form.estado} onChange={f('estado')} className={selectCls}>
                  <option>Activo</option>
                  <option>Desactivado</option>
                  <option>Baja</option>
                </select>
              </div>

              <div className="col-span-2">
                <FieldLabel>Pantalla / Nickname (Planificador)</FieldLabel>
                <select value={form.idPantalla || ''} onChange={(e) => pickPantalla(e.target.value)} className={selectCls}>
                  <option value="">Sin asignar — seleccionar pantalla…</option>
                  {form.idPantalla && !pantallaOptions.some(p => String(p.idPantalla) === String(form.idPantalla)) && (
                    <option value={form.idPantalla}>{form.idPantalla} · {form.nickname || ''} (actual)</option>
                  )}
                  {pantallaOptions.map(p => (
                    <option key={p.idPantalla} value={p.idPantalla}>
                      {p.idPantalla} · {p.nickname}{p.cuentaId ? ` · ${p.cuentaId}` : ''}
                    </option>
                  ))}
                </select>
                {form.idPantalla && (
                  <p className="mt-1.5 text-xs text-indigo-500">
                    Cuenta padre: <span className="font-mono font-semibold">{form.cuentaId || '—'}</span>
                    {form.nickname && <> · Nickname: <span className="font-semibold">{form.nickname}</span></>}
                  </p>
                )}
              </div>
            </div>

            {/* Pago y Fechas */}
            <DrawerSection>Pago y Fechas</DrawerSection>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Fecha del pago</FieldLabel>
                <input type="date" value={form.fecha} onChange={f('fecha')} className={inputCls} />
              </div>
              <div>
                <FieldLabel>Mes facturado</FieldLabel>
                <select value={form.mes} onChange={f('mes')} className={selectCls}>
                  <option value="">— Seleccionar mes —</option>
                  {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Precio Venta</FieldLabel>
                <CurrencyInput value={form.precioVenta} onChange={f('precioVenta')} decimals={0}
                  className="border-slate-200 focus:ring-indigo-400 text-sm rounded-xl" />
              </div>
              <div>
                <FieldLabel>Costo del equipo</FieldLabel>
                <CurrencyInput value={form.costo} onChange={f('costo')} decimals={0}
                  className="border-slate-200 focus:ring-indigo-400 text-sm rounded-xl" />
              </div>
              <div className="col-span-2">
                <FieldLabel>Medio de Pago</FieldLabel>
                <select value={form.medioPago} onChange={f('medioPago')} className={selectCls}>
                  <option value="">—</option>
                  {form.medioPago && !medioPagoOptions.includes(form.medioPago) && (
                    <option value={form.medioPago}>{form.medioPago}</option>
                  )}
                  {medioPagoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600
                         border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving} data-testid="drawer-submit-btn"
              className="iv-cta flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                         flex items-center justify-center gap-2 disabled:opacity-60">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</>
                : editing ? 'Guardar cambios' : <><Plus size={15} />Crear venta de equipo</>
              }
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function VentaDispositivosPage() {
  const { showToast } = useUi()
  const location  = useLocation()
  const navigate  = useNavigate()

  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [sortCol, setSortCol]   = useState('fecha')
  const [sortDir, setSortDir]   = useState('desc')
  const [explain, setExplain]   = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [deleteTarget, setDeleteTarget] = useState(null) // { idVM }
  const [nicknames, setNicknames]         = useState([])
  const [clientesTabla, setClientesTabla] = useState([])

  /* ── Loaders ── */
  const load = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/admin/payments/ventas-equipos')
      setRows(data)
      const resNicks    = await api.get('/admin/bajas/nicknames')
      setNicknames(resNicks.data || [])
      const resClientes = await api.get('/admin/clients/tabla-clientes')
      setClientesTabla(resClientes.data || [])
    } catch (e) { setError(e.response?.data?.error || e.message) }
    finally     { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  /* ── Sort ── */
  const handleSort = (key) => {
    if (key === 'acciones') return
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(key); setSortDir('asc') }
  }

  /* ── SKU autocompletado ── */
  const lastTipoFireForSku = (sku) => {
    const target = (sku || '').trim().toLowerCase()
    if (!target) return null
    const matches = rows.filter(r => (r.sku || '').trim().toLowerCase() === target && (r.tipoFire || '').trim())
    if (!matches.length) return null
    return [...matches].sort((a, b) => {
      const da = a.fecha || a.fechaAlta || ''; const db = b.fecha || b.fechaAlta || ''
      if (da !== db) return da < db ? 1 : -1
      return (b.idVM || '').localeCompare(a.idVM || '')
    })[0]?.tipoFire || null
  }

  const tipoClienteForCustomerId = (customerId) => {
    const target = (customerId || '').toString().trim()
    if (!target) return null
    return clientesTabla.find(c => (c.customerId || '').toString().trim() === target)?.tipoCliente || null
  }

  /* ── Form field handler ── */
  const f = (field) => (e) => {
    const val = e.target.value
    setForm(prev => {
      const next = { ...prev, [field]: val }
      if (field === 'customerId') {
        const tipoCliente = tipoClienteForCustomerId(val)
        if (tipoCliente) next.tipoPantalla = tipoCliente
      }
      if (field === 'sku') {
        if (SKU_TIPO_FIRE[val]) next.tipoFire = SKU_TIPO_FIRE[val]
        else { const tf = lastTipoFireForSku(val); if (tf) next.tipoFire = tf }
      }
      if (field === 'fecha' && val) next.anio = val.slice(0, 4)
      return next
    })
  }

  /* ── Open / Close ── */
  const openNew = async () => {
    setEditing(null)
    const now = new Date()
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    setForm({ ...EMPTY, fecha: todayStr(), anio: String(now.getFullYear()), mes: months[now.getMonth()] })
    setShowForm(true)
    try {
      const { data } = await api.get('/admin/payments/ventas-equipos/next-id')
      setForm(f => ({ ...f, idVM: data.nextId }))
    } catch (e) { console.error(e) }
  }

  const openEdit = (row) => { setEditing(row); setForm({ ...EMPTY, ...row }); setShowForm(true) }

  /* ── CRUD ── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const { data } = await api.put(`/admin/payments/ventas-equipos/${editing.idVM}`, form)
        setRows(prev => prev.map(r => r.idVM === editing.idVM ? data : r))
        showToast('Venta actualizada correctamente.', 'success')
      } else {
        const { data } = await api.post('/admin/payments/ventas-equipos', form)
        setRows(prev => [data, ...prev])
        showToast('Venta creada correctamente.', 'success')
      }
      setShowForm(false)
    } catch (e) { showToast(e.response?.data?.error || e.message, 'error') }
  }

  const handleImport = async () => {
    if (!confirm('Esto reemplaza TODOS los registros con los datos del Excel. ¿Continuar?')) return
    setLoading(true)
    try {
      const { data } = await api.post('/admin/payments/ventas-equipos/import')
      showToast(`Se importaron ${data.imported} registros desde el Excel.`, 'success')
      await load()
    } catch (e) { showToast(e.response?.data?.error || e.message, 'error'); setLoading(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/admin/payments/ventas-equipos/${deleteTarget.idVM}`)
      setRows(prev => prev.filter(r => r.idVM !== deleteTarget.idVM))
      showToast('Venta eliminada correctamente.', 'success')
    } catch (e) { showToast(e.response?.data?.error || e.message, 'error') }
    finally { setDeleteTarget(null) }
  }

  /* ── Option lists ── */
  const skuOptions = useMemo(() => {
    const set = new Set(rows.map(r => (r.sku || '').trim()).filter(Boolean))
    Object.keys(SKU_TIPO_FIRE).forEach(k => set.add(k))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [rows])

  const medioPagoOptions = useMemo(() => {
    const extras = new Set(rows.map(r => (r.medioPago || '').trim()).filter(Boolean))
    MEDIOS_PAGO.forEach(m => extras.delete(m))
    return [...MEDIOS_PAGO, ...[...extras].sort((a, b) => a.localeCompare(b))]
  }, [rows])

  const clienteOptions = useMemo(() =>
    [...clientesTabla].filter(c => c.customerId)
      .sort((a, b) => String(a.customerId).localeCompare(String(b.customerId), undefined, { numeric: true }))
  , [clientesTabla])

  const pantallaOptions = useMemo(() =>
    nicknames.filter(n => (n.idPantalla || '').trim())
      .sort((a, b) => String(a.idPantalla).localeCompare(String(b.idPantalla), undefined, { numeric: true }))
  , [nicknames])

  const pickCliente = (customerId) => {
    const c = clientesTabla.find(x => String(x.customerId) === String(customerId))
    setForm(prev => ({ ...prev, customerId: customerId || '', nombre: c?.nombre ?? prev.nombre,
      apellido: c?.apellido ?? prev.apellido, tipoPantalla: c?.tipoCliente ?? prev.tipoPantalla }))
  }

  const pickPantalla = (idPantalla) => {
    const p = pantallaOptions.find(x => String(x.idPantalla) === String(idPantalla))
    setForm(prev => ({ ...prev, idPantalla: idPantalla || '', nickname: p?.nickname ?? prev.nickname,
      cuentaId: p?.cuentaId ?? prev.cuentaId, cuenta: p?.cuenta ?? prev.cuenta,
      customerId: prev.customerId || p?.customerId || '',
      nombre: prev.nombre || p?.nombre || '', apellido: prev.apellido || p?.apellido || '' }))
  }

  /* ── Search + sort ── */
  const searched = useMemo(() => {
    if (!search) return rows
    const s = search.toLowerCase()
    return rows.filter(r =>
      (r.idVM || '').toLowerCase().includes(s) ||
      (r.customerId || '').toString().toLowerCase().includes(s) ||
      (r.nombre || '').toLowerCase().includes(s) ||
      (r.apellido || '').toLowerCase().includes(s) ||
      (r.tipoFire || '').toLowerCase().includes(s) ||
      (r.idPantalla || '').toLowerCase().includes(s) ||
      (r.sku || '').toLowerCase().includes(s) ||
      (r.serial || '').toLowerCase().includes(s)
    )
  }, [rows, search])

  const stats = useMemo(() => {
    const total    = searched.length
    const ingresos = searched.reduce((s, r) => s + (Number(r.precioVenta) || 0), 0)
    const firetv   = searched.filter(r => (r.tipoFire || '').toLowerCase().includes('fire')).length
    const onn      = searched.filter(r => (r.tipoFire || '').toLowerCase().includes('onn')).length
    return { total, ingresos, firetv, onn }
  }, [searched])

  const filtered = useMemo(() => {
    return [...searched].sort((a, b) => {
      let va = a[sortCol] ?? ''; let vb = b[sortCol] ?? ''
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va
      va = String(va).toLowerCase(); vb = String(vb).toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [searched, sortCol, sortDir])

  /* ── Cell renderer (inline, branded) ── */
  const renderCell = (row, key) => {
    const v = row[key]
    switch (key) {
      case 'idVM':
        return <span className="font-mono text-xs font-bold text-indigo-600">{v}</span>
      case 'idPantalla':
      case 'sku':
      case 'serial':
        return <span className="font-mono text-xs text-slate-600">{v || '—'}</span>
      case 'garantia':
        return v === 'SI'
          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><Shield size={10} />SI</span>
          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-400"><ShieldOff size={10} />{v || '—'}</span>
      case 'estado':
        return v === 'Activo'
          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 ring-1 ring-green-200"><CheckCircle2 size={10} />{v}</span>
          : v === 'Desactivado' || v === 'Baja'
            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 ring-1 ring-red-200"><XCircle size={10} />{v}</span>
            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">{v || '—'}</span>
      case 'precioVenta':
        return <span className="font-semibold text-indigo-700 whitespace-nowrap">{fmtCOP(v)}</span>
      case 'costo':
        return <span className="text-slate-500 whitespace-nowrap">{fmtCOP(v)}</span>
      case 'fecha':
        return <span className="text-xs text-slate-500 whitespace-nowrap">{v ? formatDate(v) : '—'}</span>
      case 'nombre':
      case 'apellido':
      case 'tipoFire':
        return <span className="font-medium text-slate-700">{v || '—'}</span>
      default:
        return <span className="text-slate-600">{v || '—'}</span>
    }
  }

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{CSS}</style>
      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />

      <div className="space-y-6 pb-8">

        {/* ── HERO HEADER ── */}
        <div className="iv-a1 relative rounded-3xl overflow-hidden"
             style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#1e293b 100%)' }}>
          <div className="iv-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.18] pointer-events-none"
               style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)' }} />
          <div className="iv-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.12] pointer-events-none"
               style={{ background: 'radial-gradient(circle,#8b5cf6,transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[.03] pointer-events-none"
               style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

          <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/25 mb-4">
                <Activity size={12} className="text-indigo-400" />
                <span className="text-indigo-400 text-xs font-semibold tracking-widest uppercase">Ventas</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight"
                  style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
                Venta de Equipos
              </h1>
              <p className="text-slate-400 text-sm mt-2">
                Historial de dispositivos físicos vendidos
                {!loading && <span className="text-slate-500"> · {rows.length.toLocaleString()} registros</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleImport}
                className="iv-btn-ghost shrink-0 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white/80
                           flex items-center gap-2 transition-colors">
                <RotateCcw size={15} /> Recargar Excel
              </button>
              <button onClick={openNew} id="new-equipo-btn" data-testid="new-equipo-btn"
                className="iv-cta shrink-0 px-5 py-3 rounded-2xl text-sm font-bold text-white flex items-center gap-2">
                <Plus size={17} /> Nueva Venta de Equipo
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={ShoppingCart} label="Total Equipos"    value={stats.total.toLocaleString()}  loading={loading}
            gradFrom="#6366f1" gradTo="#818cf8" delay={2}
            sub={search ? 'Resultados filtrados' : 'Ventas totales'}
            onClick={() => setExplain({
              title: 'Total Equipos', value: stats.total.toLocaleString(), icon: ShoppingCart,
              queEs: 'Cuántos dispositivos físicos (Fire TV, ONN…) se han vendido. Si hay búsqueda activa, refleja solo lo filtrado.',
              comoSeCalcula: 'Conteo de los registros de venta de equipos visibles en la tabla.',
              origen: 'Tabla de ventas de equipos. Las gráficas de tendencia viven en Análisis Dispositivos.',
              action: { label: 'Ver Análisis Dispositivos', onClick: () => navigate('/admin/analisis-dispositivos') },
            })}
          />
          <KpiCard icon={DollarSign}  label="Ingresos Equipos" value={fmtCOP(stats.ingresos)} loading={loading}
            gradFrom="#10b981" gradTo="#34d399" delay={3}
            sub="Monto recaudado"
            onClick={() => setExplain({
              title: 'Ingresos Equipos', value: fmtCOP(stats.ingresos), icon: DollarSign,
              queEs: 'La plata recaudada por venta de hardware. Línea de ingreso separada de las licencias.',
              comoSeCalcula: 'Suma del precio de venta de cada equipo visible.',
              origen: 'Campo precio de venta de cada registro de este módulo.',
            })}
          />
          <KpiCard icon={Tv}          label="FireTV Vendidos"  value={stats.firetv.toLocaleString()} loading={loading}
            gradFrom="#f97316" gradTo="#fb923c" delay={4}
            sub="Equipos Amazon"
            onClick={() => setExplain({
              title: 'FireTV Vendidos', value: stats.firetv.toLocaleString(), icon: Tv,
              queEs: 'Cuántos de los equipos vendidos son Fire TV de Amazon.',
              comoSeCalcula: 'Registros cuyo tipo de dispositivo contiene "fire".',
              origen: 'Campo tipo de dispositivo.',
            })}
          />
          <KpiCard icon={TrendingUp}  label="ONN Vendidos"     value={stats.onn.toLocaleString()} loading={loading}
            gradFrom="#8b5cf6" gradTo="#a78bfa" delay={5}
            sub="Equipos ONN"
            onClick={() => setExplain({
              title: 'ONN Vendidos', value: stats.onn.toLocaleString(), icon: TrendingUp,
              queEs: 'Cuántos de los equipos vendidos son ONN (alternativa Walmart).',
              comoSeCalcula: 'Registros cuyo tipo de dispositivo contiene "onn".',
              origen: 'Campo tipo de dispositivo.',
            })}
          />
        </div>

        {/* ── SEARCH + TABLE ── */}
        <div className="iv-a4">
          {/* Search bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="search" placeholder="Buscar por ID, nombre, equipo, serial…"
                value={search} onChange={e => setSearch(e.target.value)}
                data-testid="search-input"
                className="iv-search w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200
                           bg-white text-sm text-slate-700 placeholder:text-slate-400 transition-shadow" />
            </div>
            {!loading && (
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {filtered.length.toLocaleString()} de {rows.length.toLocaleString()} registros
              </span>
            )}
          </div>

          {/* Table card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            {loading
              ? <SkeletonTable />
              : error
                ? (
                  <div className="py-16 text-center">
                    <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
                    <p className="text-red-500 text-sm">{error}</p>
                    <button onClick={load} className="mt-4 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                      Reintentar
                    </button>
                  </div>
                )
                : filtered.length === 0
                  ? <EmptyState onNew={openNew} />
                  : (
                    <>
                      <div className="overflow-auto max-h-[36rem] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5
                                      [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full
                                      [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                        <table className="w-full text-sm border-separate border-spacing-0">
                          <thead>
                            <tr className="text-white text-xs">
                              {COLS.map(col => (
                                <th
                                  key={col.key}
                                  onClick={() => handleSort(col.key)}
                                  className="iv-th-sort sticky top-0 z-10 px-3 py-3 font-semibold whitespace-nowrap
                                             text-left cursor-pointer select-none
                                             shadow-[0_1px_0_0_rgba(0,0,0,0.08)]"
                                  style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}
                                >
                                  <div className="flex items-center gap-1">
                                    {col.label}
                                    <SortIcon colKey={col.key} sortCol={sortCol} sortDir={sortDir} />
                                  </div>
                                </th>
                              ))}
                              {/* Acciones */}
                              <th className="sticky top-0 z-10 px-3 py-3 w-20 shadow-[0_1px_0_0_rgba(0,0,0,0.08)]"
                                  style={{ background: 'linear-gradient(135deg,#4338ca,#4f46e5)' }} />
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((row, i) => (
                              <tr key={row.idVM}
                                  className={`iv-row border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                {COLS.map(col => (
                                  <td key={col.key} className="px-3 py-2.5 whitespace-nowrap">
                                    {renderCell(row, col.key)}
                                  </td>
                                ))}
                                <td className="px-2 py-2.5 whitespace-nowrap text-center sticky right-0 bg-white shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] z-10">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => openEdit(row)}
                                      className="iv-action-btn w-7 h-7 rounded-lg flex items-center justify-center text-indigo-500 hover:bg-indigo-50"
                                      data-testid={`edit-equipo-${row.idVM}`}
                                      title="Editar"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      onClick={() => setDeleteTarget({ idVM: row.idVM })}
                                      className="iv-action-btn w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50"
                                      data-testid={`delete-equipo-${row.idVM}`}
                                      title="Eliminar"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Table footer */}
                      <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-100 bg-slate-50/60">
                        <span className="text-xs text-slate-400">
                          {filtered.length.toLocaleString()} de {rows.length.toLocaleString()} registros
                        </span>
                        <span className="text-xs text-slate-400">
                          Ordenado por <strong className="text-indigo-600">{COLS.find(c => c.key === sortCol)?.label ?? sortCol}</strong>
                          {' '}({sortDir === 'asc' ? '↑ asc' : '↓ desc'})
                        </span>
                      </div>
                    </>
                  )
            }
          </div>
        </div>

      </div>

      {/* ── DRAWER ── */}
      {showForm && (
        <EquipoDrawer
          editing={editing}
          form={form}
          setForm={setForm}
          f={f}
          skuOptions={skuOptions}
          medioPagoOptions={medioPagoOptions}
          clienteOptions={clienteOptions}
          pantallaOptions={pantallaOptions}
          pickCliente={pickCliente}
          pickPantalla={pickPantalla}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* ── CONFIRM DELETE ── */}
      {deleteTarget && (
        <ConfirmDialog
          idVM={deleteTarget.idVM}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
