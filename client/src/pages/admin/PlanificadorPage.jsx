import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { todayStr } from '../../utils/dateUtils'
import {
  Monitor, Clock, AlertTriangle, CheckCircle2,
  Search, RefreshCw, Tv,
  X, FileSpreadsheet, Save,
  Link2, Undo2,
  XCircle, Wallet, Gift, DollarSign, Percent, Package,
  Users, Maximize2, Minimize2, KeyRound, Copy, Check,
  Building2, ExternalLink, ChevronDown,
  Eye, EyeOff, Pencil, Trash2, Receipt, Loader2,
} from 'lucide-react'
import * as htmlToImage from 'html-to-image'
import { cn } from '../../utils/cn'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { PlanificadorTable } from '../../components/ui/PlanificadorTable'
import { formatDate, formatCurrency } from '../../utils/excelUtils'

import { StatCard } from './planificador/StatCard'
import { CategoryPanel, screenToVentaPrefill, CATEGORY_CONFIG } from './planificador/CategoryPanel'
import { EditModal } from './planificador/EditModal'
import { ComprobanteModal } from './planificador/ComprobanteModal'
import {
  calcDias, getRowVariant, ROW_BG, estadoBadgeVariant, getPlanSortVal,
} from './planificador/rowHelpers'
import { MonthsChip } from './planificador/TableBits'

const DIAS_ALERTA_CP = 30

const CSS = `
  @keyframes pl-fade-up  { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes pl-fade-in  { from { opacity:0 } to { opacity:1 } }
  @keyframes pl-scale-in { from { opacity:0; transform:scale(.94) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
  @keyframes pl-orb-1    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes pl-orb-2    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  @keyframes pl-shimmer  { from { background-position:-200% 0 } to { background-position:200% 0 } }

  .pl-a1 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .pl-a2 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .pl-a3 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) .12s both }
  .pl-a4 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) .18s both }

  .pl-orb-1 { animation: pl-orb-1 8s ease-in-out infinite }
  .pl-orb-2 { animation: pl-orb-2 11s ease-in-out infinite }

  /* ── CTA primario (Actualizar) ── */
  .pl-cta {
    background: linear-gradient(135deg, #a855f7, #ec4899);
    box-shadow: 0 4px 18px rgba(168,85,247,.4);
    transition: all .22s ease; border: none;
  }
  .pl-cta:hover  { box-shadow: 0 7px 24px rgba(168,85,247,.55); transform: translateY(-2px) }
  .pl-cta:active { transform: translateY(0) }

  /* ── Botones ghost del hero ── */
  .pl-btn-ghost {
    transition: all .2s ease;
    border: 1px solid rgba(255,255,255,.2);
    background: transparent;
  }
  .pl-btn-ghost:hover { background: rgba(255,255,255,.1) }

  /* ── Glassmorphism — panel de filtros y widgets ── */
  .pl-glass {
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border: 1px solid rgba(168,85,247,0.12);
    border-radius: 18px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9);
    transition: box-shadow .25s ease, border-color .25s ease;
  }
  .pl-glass:hover { border-color: rgba(168,85,247,0.22); box-shadow: 0 8px 32px rgba(168,85,247,0.1), inset 0 1px 0 rgba(255,255,255,0.9) }

  /* ── Input de búsqueda ── */
  .pl-search {
    background: rgba(255,255,255,0.85);
    border: 1.5px solid rgba(168,85,247,0.15);
    border-radius: 12px;
    transition: all .2s ease;
  }
  .pl-search:focus { outline: none; border-color: #a855f7; box-shadow: 0 0 0 3px rgba(168,85,247,0.15); background: #fff }

  /* ── Select de filtro ── */
  .pl-select {
    background: rgba(255,255,255,0.85);
    border: 1.5px solid rgba(168,85,247,0.15);
    border-radius: 12px;
    transition: all .2s ease;
    cursor: pointer;
  }
  .pl-select:focus { outline: none; border-color: #a855f7; box-shadow: 0 0 0 3px rgba(168,85,247,0.15) }

  /* ── Card de capacidad ── */
  .pl-capacity-card {
    background: linear-gradient(135deg, rgba(248,246,255,0.95) 0%, rgba(245,240,255,0.95) 100%);
    border: 1px solid rgba(168,85,247,0.18);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 2px 16px rgba(168,85,247,0.07);
  }
  .pl-capacity-card .cap-header {
    background: linear-gradient(90deg, rgba(168,85,247,0.08), rgba(236,72,153,0.06));
    border-bottom: 1px solid rgba(168,85,247,0.12);
  }

  /* ── Card de advertencia (inconsistencias) ── */
  .pl-warning-card {
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    border: 1px solid rgba(245,158,11,0.35);
    border-radius: 18px;
    box-shadow: 0 2px 12px rgba(245,158,11,0.1);
  }

  /* ── Tabla filas ── */
  .pl-row { transition: background .15s ease }
  .pl-row:hover td { background: rgba(168,85,247,0.04) }

  /* ── Overlays y modales ── */
  .pl-overlay { animation: pl-fade-in .2s ease both }
  .pl-confirm { animation: pl-scale-in .22s cubic-bezier(.22,1,.36,1) both }

  /* ── Skeleton ── */
  .pl-skeleton {
    background: linear-gradient(90deg,#f1f5f9 25%,#ede9fe 50%,#f1f5f9 75%);
    background-size: 200% 100%;
    animation: pl-shimmer 1.6s infinite;
    border-radius: 6px;
  }

  /* ── Botón Estatus Cliente activo ── */
  .pl-estatus-btn-active {
    background: linear-gradient(135deg,#a855f7,#ec4899);
    color: white;
    box-shadow: 0 4px 14px rgba(168,85,247,0.35);
  }

  @media (prefers-reduced-motion: reduce) {
    .pl-a1,.pl-a2,.pl-a3,.pl-a4,
    .pl-orb-1,.pl-orb-2,.pl-overlay,.pl-confirm,.pl-skeleton { animation: none !important; transition: none !important }
  }
`


// ─── Labels de campo para el diff de sincronización ──────────────────────────

const SYNC_CAMPO_LABELS = {
  cuenta:       'Usuario',
  password:     'Contraseña',
  credito:      'Crédito',
  inicio:       'Inicio',
  finalizacion: 'Fin',
}

// ─── Modal informe comparativo de sincronización con Cuentas Padre ────────────

function VencimientoChip({ diasAlFin }) {
  if (diasAlFin == null) return <span className="text-gray-300 text-xs">—</span>
  if (diasAlFin <= 0)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold whitespace-nowrap"><AlertTriangle size={10} /> Vencida</span>
  if (diasAlFin <= 7)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold whitespace-nowrap"><Clock size={10} /> {diasAlFin}d</span>
  return <span className="text-gray-500 text-xs whitespace-nowrap">{diasAlFin}d</span>
}

function SyncDiffModal({ diff, canUndo, onUndo, onClose, undoing }) {
  const [soloConCambios, setSoloConCambios] = useState(false)

  const actualizadas  = diff.filter(d => d.status === 'actualizada')
  const sinCambio     = diff.filter(d => d.status === 'sin_cambio')
  const sinPantallas  = diff.filter(d => d.status === 'sin_pantallas')
  const vencidas      = diff.filter(d => d.diasAlFin != null && d.diasAlFin <= 0)
  const porVencer     = diff.filter(d => d.diasAlFin != null && d.diasAlFin > 0 && d.diasAlFin <= 7)

  const visible = soloConCambios
    ? actualizadas
    : [...actualizadas, ...sinCambio]

  return (
    <div className="pl-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[3px] p-4" onClick={onClose}>
      <div className="pl-confirm bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-t-2xl px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Link2 size={20} /> Sincronización con Cuentas Padre
            </h2>
            <p className="text-slate-300 text-sm">Campos cuenta · contraseña · crédito · inicio · fin actualizados</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Chips resumen */}
        <div className="flex items-center flex-wrap gap-2.5 px-6 py-4 border-b border-gray-100 flex-shrink-0">
          {vencidas.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-semibold">
              <AlertTriangle size={13} />
              {vencidas.length} vencida{vencidas.length > 1 ? 's' : ''}
            </span>
          )}
          {porVencer.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
              <Clock size={13} />
              {porVencer.length} por vencer
            </span>
          )}
          {actualizadas.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold">
              <Pencil size={13} />
              {actualizadas.length} con cambio{actualizadas.length > 1 ? 's' : ''}
            </span>
          )}
          {sinCambio.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 text-sm font-semibold">
              <CheckCircle2 size={13} />
              {sinCambio.length} sin cambio
            </span>
          )}
          {sinPantallas.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-sm font-semibold">
              <Monitor size={13} />
              {sinPantallas.length} sin pantallas
            </span>
          )}
          <button
            onClick={() => setSoloConCambios(s => !s)}
            className={`ml-auto text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              soloConCambios
                ? 'bg-orange-500 text-white border-orange-500'
                : 'border-gray-300 text-gray-500 hover:border-orange-300 hover:text-orange-600'
            }`}
          >
            {soloConCambios ? 'Mostrar todos' : 'Solo con cambios'}
          </button>
        </div>

        {/* Tabla de diff */}
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50">
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold border-b border-gray-200">ID Cuenta</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold border-b border-gray-200">Usuario IPTV</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold text-center border-b border-gray-200">Pantallas</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold text-center border-b border-gray-200">Estado cuenta</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold text-center border-b border-gray-200">Vencimiento</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold text-center border-b border-gray-200">Sincronización</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold border-b border-gray-200">Cambios detectados</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    <CheckCircle2 size={28} className="mx-auto mb-2 text-gray-300" />
                    Todos los datos ya estaban sincronizados.
                  </td>
                </tr>
              )}
              {visible.map((item, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-50 ${
                    item.status === 'actualizada' ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono font-bold text-brand-accent whitespace-nowrap">
                    {item.cuentaId}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 max-w-[160px] truncate">
                    {item.cuenta || <span className="text-gray-400 italic">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-600 font-medium">
                    {item.pantallasAfectadas > 0 ? item.pantallasAfectadas : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    {item.estado
                      ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${item.estado === 'Válido' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.estado}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <VencimientoChip diasAlFin={item.diasAlFin} />
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    {item.status === 'actualizada' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                        <Pencil size={10} /> Actualizada
                      </span>
                    ) : item.status === 'sin_pantallas' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
                        <Monitor size={10} /> Sin pantallas
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 text-xs font-semibold">
                        <CheckCircle2 size={10} /> Sin cambio
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {item.cambios.length > 0 ? (
                      <div className="space-y-1">
                        {item.cambios.map((c, j) => (
                          <div key={j} className="flex items-baseline flex-wrap gap-1 text-xs">
                            <span className="font-semibold text-gray-700 whitespace-nowrap">
                              {SYNC_CAMPO_LABELS[c.campo] || c.campo}:
                            </span>
                            <span className="text-red-500 line-through whitespace-nowrap">
                              {c.antes ?? '—'}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-green-700 font-semibold whitespace-nowrap">
                              {c.despues ?? '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-xs text-gray-400">
            <CheckCircle2 size={12} className="inline mr-1 text-green-500" />
            Cambios guardados en la base de datos.
          </p>
          <div className="flex gap-2">
            {canUndo && (
              <button
                onClick={onUndo}
                disabled={undoing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-40 text-sm font-medium transition-colors"
              >
                <Undo2 size={14} /> {undoing ? 'Deshaciendo…' : 'Deshacer sincronización'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Panel de alertas de Cuentas Padre (vencidas / en alerta) ────────────────

function CuentasPadreAlertPanel({ cuentas, titulo, variante, onClose, navigate }) {
  const isVencidas = variante === 'vencida'
  const headerGrad = isVencidas ? 'from-red-600 to-red-700' : 'from-amber-500 to-amber-600'
  return (
    <div className="pl-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[3px] p-4" onClick={onClose}>
      <div className="pl-confirm bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className={`bg-gradient-to-r ${headerGrad} rounded-t-2xl px-6 py-4 flex items-center justify-between flex-shrink-0`}>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 size={20} /> {titulo}
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50">
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold border-b border-gray-200">ID Cuenta</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold border-b border-gray-200">Usuario IPTV</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold text-center border-b border-gray-200">Vencimiento</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold text-center border-b border-gray-200">Días</th>
              </tr>
            </thead>
            <tbody>
              {cuentas.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Sin registros en esta categoría</td></tr>
              ) : cuentas.map(cp => (
                <tr key={cp.cuentaId} className={`border-b border-gray-50 ${isVencidas ? 'bg-red-50 hover:bg-red-100' : 'bg-amber-50 hover:bg-amber-100'}`}>
                  <td className="px-4 py-2.5 font-mono font-bold text-brand-accent">{cp.cuentaId}</td>
                  <td className="px-4 py-2.5 text-gray-700">{cp.nombre || <span className="text-gray-400 italic">—</span>}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{cp.fin ? formatDate(cp.fin) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-center">
                    {cp.diasAlFin != null ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${cp.diasAlFin <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {cp.diasAlFin <= 0 ? `${Math.abs(cp.diasAlFin)}d vencida` : `${cp.diasAlFin}d`}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => navigate('/admin/cuentas-padre')}
            className="flex items-center gap-1.5 text-sm text-brand-primary hover:underline font-medium"
          >
            <ExternalLink size={13} /> Ver en Cuentas Padre
          </button>
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function PlanificadorPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useUi()
  const [data, setData]                   = useState(null)
  const [loading, setLoading]             = useState(true)
  const [exporting, setExporting]         = useState(false)
  const [saving, setSaving]               = useState(false)
  const [syncing, setSyncing]             = useState(false)
  const [showSyncDiff, setShowSyncDiff]   = useState(false)
  const [syncDiffData, setSyncDiffData]   = useState([])
  const [error, setError]                 = useState(null)
  const [search, setSearch]               = useState('')
  const [filterStatus, setFilterStatus]   = useState('ALL')
  const [hidePwd, setHidePwd]             = useState({})
  const [editRow, setEditRow]             = useState(null)
  const [sortConfig, setSortConfig]       = useState({ key: 'cuentaId', dir: 'asc' })
  const [prevPantallas, setPrevPantallas] = useState(null)
  const [undoing, setUndoing]             = useState(false)
  const [activePanel, setActivePanel]     = useState(null)
  const [explain, setExplain]             = useState(null)
  const [showEstatusPanel, setShowEstatusPanel] = useState(false)
  const [comprobanteRow, setComprobanteRow] = useState(null)
  const [showCuentaData, setShowCuentaData]     = useState(false)
  const [estatusExpanded, setEstatusExpanded]   = useState(false)
  const [showEstatusPwd, setShowEstatusPwd]     = useState(false)
  const [copied, setCopied]                     = useState(false)
  const [copiandoImg, setCopiandoImg]           = useState(false)
  const estatusTablaRef = useRef(null)
  const [showCpPanel, setShowCpPanel]           = useState(false)
  const [cpPanelVariante, setCpPanelVariante]   = useState('vencida')
  const [showCapacidad, setShowCapacidad]       = useState(false)

  // Guarda una "foto" del estado actual antes de aplicar un cambio, para poder deshacerlo
  const snapshotBeforeChange = () => {
    if (data?.pantallas) setPrevPantallas(data.pantallas)
  }

  const handleUndo = async () => {
    if (!prevPantallas) return
    if (!confirm('¿Deshacer el último cambio realizado en el planificador?')) return
    setUndoing(true)
    try {
      const r = await api.post('/admin/planificador/restore', prevPantallas)
      setData(r.data)
      setPrevPantallas(null)
      showToast(r.data.message, 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setUndoing(false)
    }
  }

  const onSort = (key) => setSortConfig(prev =>
    prev.key === key
      ? prev.dir === 'asc' ? { key, dir: 'desc' } : { key: null, dir: 'asc' }
      : { key, dir: 'asc' }
  )

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const r = await api.get('/admin/planificador')
      setData(r.data)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const r = await api.get('/admin/planificador/export', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      const fecha = todayStr()
      a.href = url
      a.download = `Planificador_Cuentas_${fecha}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast('Excel exportado correctamente', 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleGuardar = async () => {
    setSaving(true)
    try {
      const save = await api.post('/admin/planificador/save-to-excel')
      const refresh = await api.get('/admin/planificador')
      setData(refresh.data)
      showToast(save.data.message, 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    snapshotBeforeChange()
    setSyncing(true)
    try {
      const r = await api.post('/admin/planificador/sync-cuentas-padre')
      setData(r.data)
      if (r.data.diff?.length > 0) {
        setSyncDiffData(r.data.diff)
        setShowSyncDiff(true)
      } else {
        showToast(r.data.message, 'success')
      }
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleSyncUndo = async () => {
    if (!prevPantallas) return
    setUndoing(true)
    try {
      const r = await api.post('/admin/planificador/restore', prevPantallas)
      setData(r.data)
      setPrevPantallas(null)
      setShowSyncDiff(false)
      setSyncDiffData([])
      showToast(r.data.message, 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setUndoing(false)
    }
  }

  useEffect(() => { load() }, [])

  // Auto-abrir panel Estatus Cliente si venimos del Dashboard con esa indicación
  useEffect(() => {
    if (location.state?.openEstatusPanel && !loading) {
      setShowEstatusPanel(true)
      // Limpiar el state para que no se reabra al recargar
      window.history.replaceState({}, '')
    }
  }, [location.state, loading])

  const { rows, stats } = useMemo(() => {
    if (!data) return { rows: [], stats: {} }
    const { pantallas, diasAlerta } = data

    const cuentas       = new Set(pantallas.map(p => p.cuentaId)).size
    const variantes     = pantallas.map(p => getRowVariant(p, diasAlerta))
    const activas       = pantallas.reduce((sum, p) => sum + (Number(p.pantallas) || 0), 0)
    const proximaVencer = variantes.filter(v => v === 'alerta').length
    const libres        = variantes.filter(v => v === 'libre').length

    // ── Indicadores financieros y de negocio ──────────────────────────────
    const asignadas     = pantallas.length - libres
    const vencidas      = variantes.filter(v => v === 'vencido').length
    const deudores        = pantallas.filter(p => p.debe).length
    const montoCartera    = pantallas.reduce((s, p) => s + (p.debe ? (Number(p.montoDebe) || 0) : 0), 0)
    const montoCarteraUSD = pantallas.reduce((s, p) => s + (p.debe ? (Number(p.montoDebeUSD) || 0) : 0), 0)
    const cortesias     = variantes.filter(v => v === 'cortesia').length
    
    const ocupacion     = pantallas.length ? Math.round((asignadas / pantallas.length) * 100) : 0

    let filtered = pantallas
    const sq = search.toLowerCase()
    if (sq) {
      filtered = filtered.filter(p => {
        const nombreCompleto = `${p.nombre || ''} ${p.apellido || ''}`.toLowerCase()
        const apellidoNombre = `${p.apellido || ''} ${p.nombre || ''}`.toLowerCase()
        return (
          (p.cuentaId || '').toLowerCase().includes(sq) ||
          (p.cuenta || '').toLowerCase().includes(sq) ||
          (p.nombre || '').toLowerCase().includes(sq) ||
          (p.apellido || '').toLowerCase().includes(sq) ||
          nombreCompleto.includes(sq) ||
          apellidoNombre.includes(sq) ||
          (p.nickname || '').toLowerCase().includes(sq) ||
          (p.customerId || '').toLowerCase().includes(sq)
        )
      })
    }
    if (filterStatus !== 'ALL') {
      const target = filterStatus.toLowerCase()
      filtered = filtered.filter(p => getRowVariant(p, diasAlerta) === target)
    }

    filtered = [...filtered].sort((a, b) => {
      if (sortConfig.key) {
        const aVal = getPlanSortVal(a, sortConfig.key)
        const bVal = getPlanSortVal(b, sortConfig.key)
        if (aVal !== bVal) {
          if (aVal == null) return 1
          if (bVal == null) return -1
          const cmp = typeof aVal === 'string'
            ? aVal.localeCompare(bVal, 'es', { sensitivity: 'base' })
            : Number(aVal) - Number(bVal)
          if (cmp !== 0) return sortConfig.dir === 'asc' ? cmp : -cmp
        }
      }
      if (a.cuentaId !== b.cuentaId) return a.cuentaId < b.cuentaId ? -1 : 1
      return a.idPantalla < b.idPantalla ? -1 : 1
    })

    const rows = filtered.map((p, i) => ({
      ...p,
      isGroupStart: i === 0 || filtered[i - 1].cuentaId !== p.cuentaId,
    }))

    return {
      rows,
      stats: {
        cuentas, activas, proximaVencer, libres, diasAlerta, total: pantallas.length,
        vencidas, deudores, cortesias, montoCartera, montoCarteraUSD, ocupacion, asignadas,
      },
    }
  }, [data, search, filterStatus, sortConfig])

  // ── Listas de detalle para las tarjetas inteligentes ──────────────────────
  // Independientes de los filtros de la tabla: cada tarjeta siempre muestra el panorama
  // completo de su categoría de negocio (riesgo, cobranza, cortesías, inventario, cartera).
  const categoryLists = useMemo(() => {
    if (!data) return {}
    const { pantallas, diasAlerta } = data
    const enriched = pantallas.map(p => ({
      ...p,
      _variant: getRowVariant(p, diasAlerta),
      _dias: calcDias(p.duracionReal || p.finalizacion) ?? p.diasVencimientoReal ?? p.diasVencimiento ?? null,
    }))
    const byDiasAsc = (a, b) => (a._dias ?? Infinity) - (b._dias ?? Infinity)
    const byNombre  = (a, b) => [a.nombre, a.apellido].join(' ').localeCompare([b.nombre, b.apellido].join(' '), 'es', { sensitivity: 'base' })
    return {
      alerta:   enriched.filter(p => p._variant === 'alerta').sort(byDiasAsc),
      vencido:  enriched.filter(p => p._variant === 'vencido').sort(byDiasAsc),
      libre:    enriched.filter(p => p._variant === 'libre').sort(byNombre),
      debe:     enriched.filter(p => p.debe).sort((a, b) => (Number(b.montoDebe) || 0) - (Number(a.montoDebe) || 0)),
      cortesia: enriched.filter(p => p._variant === 'cortesia').sort(byDiasAsc),
    }
  }, [data])

  const cpVencidas    = useMemo(() => (data?.cuentasPadreStatus || []).filter(cp => cp.variante === 'vencida'), [data])
  const cpAlerta      = useMemo(() => (data?.cuentasPadreStatus || []).filter(cp => cp.variante === 'alerta'),  [data])
  const syncPendiente = data?.syncPendiente ?? false

  // Abre Pagos → "Nueva Venta" con los datos del cliente/pantalla ya pre-cargados,
  // salvo en "Pantallas sin asignar", donde lo que corresponde es asignar un titular
  // a la pantalla libre directamente desde el formulario de edición.
  const handleGenerateVenta = (screen, catKey) => {
    setActivePanel(null)
    if (catKey === 'libre') {
      snapshotBeforeChange()
      setEditRow(screen)
      return
    }
    navigate('/admin/payments', {
      state: {
        prefillVenta: screenToVentaPrefill(screen, catKey),
        prefillSource: CATEGORY_CONFIG[catKey]?.title || 'Planificador',
      },
    })
  }

  // Copia el Estatus Cliente como IMAGEN (mismo comportamiento que el botón
  // Copiar del comprobante de renovación): captura la tabla completa —
  // incluidas las filas fuera del scroll — y la deja en el portapapeles.
  // La columna Comprobante (botones "Generar") se excluye de la captura.
  const handleCopiarImagenEstatus = async () => {
    const el = estatusTablaRef.current
    if (!el || copiandoImg) return
    setCopiandoImg(true)
    try {
      const colExcluida = el.querySelector('th[data-nocapture]')?.offsetWidth || 0
      const blob = await htmlToImage.toBlob(el, {
        // Con listas muy largas se baja la resolución para no exceder el
        // tamaño máximo de canvas del navegador
        pixelRatio: el.scrollHeight > 6000 ? 1 : 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        width: el.scrollWidth - colExcluida,
        height: el.scrollHeight,
        style: { maxHeight: 'none', overflow: 'visible' },
        filter: (n) => !(n.hasAttribute && n.hasAttribute('data-nocapture')),
      })
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
      showToast('Estatus copiado como imagen — pégalo donde lo necesites.', 'success')
    } catch (e) {
      showToast(`No se pudo copiar la imagen: ${e.message || e}`, 'error')
    } finally {
      setCopiandoImg(false)
    }
  }

  const togglePwd = (id) => setHidePwd(p => ({ ...p, [id]: !p[id] }))

  const handleDelete = async (row) => {
    const cliente = [row.nombre, row.apellido].filter(Boolean).join(' ') || 'sin asignar'
    const ok = window.confirm(
      `¿Eliminar la pantalla ${row.idPantalla} (${cliente})?\n\nPodrás deshacer este cambio con el botón "Deshacer".`
    )
    if (!ok) return
    snapshotBeforeChange()
    try {
      await api.delete(`/admin/planificador/${row.idPantalla}`)
      setData(d => ({ ...d, pantallas: d.pantallas.filter(p => p.idPantalla !== row.idPantalla) }))
      showToast(`Pantalla ${row.idPantalla} eliminada correctamente.`, 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="pl-skeleton w-48 h-3 mx-auto mb-4 rounded-full" />
        <div className="pl-skeleton w-32 h-2 mx-auto rounded-full" />
        <p className="text-purple-400 text-sm mt-4 font-medium">Cargando planificador…</p>
      </div>
    </div>
  )

  if (error) return (
    <Card className="p-8 text-center">
      <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
      <p className="text-red-600 font-medium">{error}</p>
      <Button onClick={load} className="mt-4" variant="secondary"><RefreshCw size={14} /> Reintentar</Button>
    </Card>
  )

  return (
    <div>
      <style>{CSS}</style>
      {/* Modal informe comparativo de sincronización */}
      {showSyncDiff && syncDiffData.length > 0 && (
        <SyncDiffModal
          diff={syncDiffData}
          canUndo={!!prevPantallas}
          onUndo={handleSyncUndo}
          onClose={() => setShowSyncDiff(false)}
          undoing={undoing}
        />
      )}

      {/* Panel de alertas Cuentas Padre */}
      {showCpPanel && (
        <CuentasPadreAlertPanel
          cuentas={cpPanelVariante === 'vencida' ? cpVencidas : cpAlerta}
          titulo={cpPanelVariante === 'vencida'
            ? `${cpVencidas.length} Cuenta${cpVencidas.length !== 1 ? 's' : ''} Padre Vencida${cpVencidas.length !== 1 ? 's' : ''}`
            : `${cpAlerta.length} Cuenta${cpAlerta.length !== 1 ? 's' : ''} Padre en Alerta`}
          variante={cpPanelVariante}
          onClose={() => setShowCpPanel(false)}
          navigate={navigate}
        />
      )}

      {/* Modal de edición — key por idPantalla: fuerza un remount limpio del
          formulario al saltar entre pantallas hermanas (crear/editar), evitando
          que queden campos de la pantalla anterior mezclados con la nueva. */}
      {editRow && (
        <EditModal
          key={editRow.idPantalla}
          row={editRow}
          allPantallas={data?.pantallas}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); load() }}
          onCreated={(nueva) => { setEditRow(nueva); load() }}
          onSwitchPantalla={(sibling) => { snapshotBeforeChange(); setEditRow(sibling) }}
          onDeleteSibling={handleDelete}
        />
      )}

      {/* Panel de detalle de tarjeta inteligente */}
      {activePanel && (
        <CategoryPanel
          catKey={activePanel}
          screens={categoryLists[activePanel] || []}
          onClose={() => setActivePanel(null)}
          onGenerate={handleGenerateVenta}
          onEdit={(screen) => { setActivePanel(null); snapshotBeforeChange(); setEditRow(screen) }}
        />
      )}

      {/* ── HERO HEADER ── */}
      <div className="pl-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#4a044e 0%,#2e1065 100%)' }}>
        <div className="pl-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#c026d3,transparent 70%)' }} />
        <div className="pl-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.15] pointer-events-none" style={{ background: 'radial-gradient(circle,#9333ea,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/25 mb-4">
              <Tv size={12} className="text-fuchsia-300" />
              <span className="text-fuchsia-300 text-xs font-semibold tracking-widest uppercase">Operación Core</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Planificador
            </h1>
            <p className="text-fuchsia-100/70 text-sm mt-2">
              Control de cuentas y asignación de pantallas IPTV {!loading && <span className="text-fuchsia-300/50">· {stats.total} pantallas en {stats.cuentas} cuentas · Alerta: ≤{stats.diasAlerta} días</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {prevPantallas && (
              <button onClick={handleUndo} disabled={undoing} className="pl-btn-ghost px-4 py-2.5 rounded-2xl text-sm font-semibold text-white/80 flex items-center gap-2">
                <Undo2 size={15} /> {undoing ? 'Deshaciendo…' : 'Deshacer'}
              </button>
            )}
            <button onClick={handleSync} disabled={syncing} className="pl-btn-ghost relative px-4 py-2.5 rounded-2xl text-sm font-semibold text-white/80 flex items-center gap-2">
              <Link2 size={15} /> {syncing ? 'Sincronizando…' : 'Sincronizar CP'}
              {syncPendiente && !syncing && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" /></span>
              )}
            </button>
            <button onClick={handleExport} disabled={exporting} className="pl-btn-ghost px-4 py-2.5 rounded-2xl text-sm font-semibold text-white/80 flex items-center gap-2">
              <FileSpreadsheet size={15} /> Exportar Excel
            </button>
            <button onClick={handleGuardar} disabled={saving} className="pl-btn-ghost px-4 py-2.5 rounded-2xl text-sm font-semibold text-white/80 flex items-center gap-2">
              <Save size={15} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button onClick={load} className="pl-cta px-5 py-2.5 rounded-2xl text-sm font-bold text-white flex items-center gap-2">
              <RefreshCw size={15} /> Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Aviso: pantallas con ID de cuenta desalineado del prefijo de su ID de pantalla */}
      {data?.inconsistencias?.length > 0 && (
        <div className="pl-warning-card p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                {data.inconsistencias.length} pantalla{data.inconsistencias.length === 1 ? '' : 's'} con ID de cuenta desalineado
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                El ID de cuenta no corresponde al grupo de la pantalla — probablemente un error de captura en el Excel de origen.
                Corrígelo editando la pantalla y seleccionando el "Usuario IPTV" correcto.
              </p>
              <ul className="mt-2 space-y-1">
                {data.inconsistencias.map(inc => {
                  const row = data.pantallas.find(p => p.idPantalla === inc.idPantalla)
                  return (
                    <li key={inc.idPantalla} className="flex items-center justify-between gap-2 text-xs text-amber-800">
                      <span className="font-mono">
                        {inc.idPantalla}: cuentaId actual <strong>{inc.cuentaId}</strong> · debería ser <strong>{inc.cuentaIdEsperado}</strong>
                      </span>
                      {row && (
                        <button
                          onClick={() => { snapshotBeforeChange(); setEditRow(row) }}
                          className="shrink-0 text-amber-700 hover:text-amber-900 underline font-medium"
                        >
                          Editar
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />

      {/* Stats — Fila 1 */}
      <div className="pl-a2 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={Tv}           label="Cuentas totales"  value={stats.cuentas}       variant="solid"   tone="indigo"  sub={`${stats.total} pantallas`}
          onClick={() => setExplain({
            title: 'Cuentas totales', value: stats.cuentas, icon: Tv,
            queEs: 'Cuántas cuentas padre distintas tienen pantallas registradas en el Planificador, y cuántas pantallas suman entre todas.',
            comoSeCalcula: 'Se cuentan los **IDs de cuenta únicos** entre las filas del Planificador. Las pantallas son la suma de la columna # — un registro puede valer por 2 o más pantallas.',
            origen: 'Tabla del Planificador. El inventario completo de cuentas (incluidas las que no tienen pantallas) vive en **Cuentas Padre**.',
          })} />
        <StatCard icon={CheckCircle2} label="Pantallas activas" value={stats.activas}       variant="light"   tone="emerald"
          onClick={() => setExplain({
            title: 'Pantallas activas', value: stats.activas, icon: CheckCircle2,
            queEs: 'Pantallas asignadas a un cliente y con el servicio vigente (no vencidas).',
            comoSeCalcula: 'Se suman las pantallas de las filas que tienen cliente asignado y cuya fecha de vencimiento no ha pasado.',
            origen: 'Campos de cliente y fechas de cada fila del Planificador.',
          })} />
        <StatCard icon={Clock}        label="Próx. a vencer"   value={stats.proximaVencer} variant="outline" tone="amber"   sub={`≤ ${stats.diasAlerta} días`}
          onClick={() => setActivePanel('alerta')} />
        <StatCard icon={Monitor}      label="Sin asignar"       value={stats.libres}        variant="light"   tone="sky"     sub="Pantallas libres"
          onClick={() => setActivePanel('libre')} />
      </div>

      {/* Indicadores financieros y de negocio */}
      <div className="pl-a3 grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <StatCard icon={XCircle}    label="Vencidas"            value={stats.vencidas}                    variant="outline" tone="red"     sub="Requieren acción inmediata"
          onClick={() => setActivePanel('vencido')} />
        <StatCard icon={Wallet}     label="Cuentas que deben"   value={stats.deudores}                    variant="outline" tone="amber"   sub="Pendientes de cobro"
          onClick={() => setActivePanel('debe')} />
        <StatCard icon={Gift}       label="Cortesías activas"   value={stats.cortesias}                   variant="outline" tone="pink"    sub="Sin generar ingreso"
          onClick={() => setActivePanel('cortesia')} />
        <StatCard icon={DollarSign} label="Cartera COP"         value={formatCurrency(stats.montoCartera)} variant="solid"   tone="orange"  sub="Deuda en pesos"
          onClick={() => setActivePanel('debe')} />
        <StatCard icon={DollarSign} label="Cartera USD"         value={`US$${Number(stats.montoCarteraUSD || 0).toLocaleString('en-US')}`} variant="solid" tone="emerald" sub="Deuda en dólares"
          onClick={() => setActivePanel('debe')} />
        <StatCard icon={Percent}    label="Ocupación"           value={`${stats.ocupacion}%`}              variant="light"   tone="cyan"    sub={`${stats.asignadas} de ${stats.total} pantallas`}
          onClick={() => setExplain({
            title: 'Ocupación', value: `${stats.ocupacion}%`, icon: Percent,
            queEs: 'Qué porcentaje de las pantallas registradas en el Planificador están asignadas a un cliente.',
            comoSeCalcula: `**(${stats.asignadas} asignadas ÷ ${stats.total} pantallas) × 100**. El Planificador es la fuente oficial de capacidad: el panel de Ocupación del Dashboard y el de Cuentas Padre usan esta misma base, así todo coincide.`,
            origen: 'Filas del Planificador (asignadas = con nombre o nickname distinto de "libre").',
          })} />
      </div>

      {/* Alertas de Cuentas Padre — visibles cuando hay vencidas o en alerta */}
      {(cpVencidas.length > 0 || cpAlerta.length > 0) && (
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={Building2} label="CP Vencidas" value={cpVencidas.length}
              variant="outline" tone="red" sub="Cuentas padre con servicio vencido"
              onClick={() => { setCpPanelVariante('vencida'); setShowCpPanel(true) }}
            />
            <StatCard
              icon={AlertTriangle} label="CP En Alerta" value={cpAlerta.length}
              variant="outline" tone="amber" sub={`Vencen en ≤ ${DIAS_ALERTA_CP} días`}
              onClick={() => { setCpPanelVariante('alerta'); setShowCpPanel(true) }}
            />
          </div>
          {data?.capacidadPorCuenta?.length > 0 && (
            <button
              onClick={() => setShowCapacidad(p => !p)}
              className="mt-2 flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-700 font-medium transition-colors"
            >
              <ChevronDown size={12} className={cn('transition-transform', showCapacidad && 'rotate-180')} />
              {showCapacidad ? 'Ocultar capacidad por cuenta padre' : 'Ver capacidad por cuenta padre'}
            </button>
          )}
        </div>
      )}

      {/* Widget colapsable de capacidad por cuenta padre */}
      {data?.capacidadPorCuenta?.length > 0 && showCapacidad && (
        <div className="pl-capacity-card mb-4">
          <div className="cap-header flex items-center justify-between px-5 py-3">
            <span className="text-sm font-bold text-purple-700 tracking-wide">Capacidad por cuenta padre</span>
            <button
              onClick={() => setShowCapacidad(false)}
              className="text-purple-400 hover:text-purple-700 p-1 rounded-lg transition-colors"
            >
              <ChevronDown size={15} className="rotate-180" />
            </button>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr className="text-gray-500 bg-gray-50 text-left">
                  <th className="sticky top-0 bg-gray-50 px-3 py-2 font-semibold border-b border-gray-200">ID Cuenta</th>
                  <th className="sticky top-0 bg-gray-50 px-3 py-2 font-semibold border-b border-gray-200">Usuario</th>
                  <th className="sticky top-0 bg-gray-50 px-3 py-2 font-semibold text-center border-b border-gray-200">Cap.</th>
                  <th className="sticky top-0 bg-gray-50 px-3 py-2 font-semibold text-center border-b border-gray-200">Ocup.</th>
                  <th className="sticky top-0 bg-gray-50 px-3 py-2 font-semibold text-center border-b border-gray-200">Libres</th>
                  <th className="sticky top-0 bg-gray-50 px-3 py-2 font-semibold border-b border-gray-200 min-w-[110px]">% Ocupación</th>
                  <th className="sticky top-0 bg-gray-50 px-3 py-2 font-semibold text-center border-b border-gray-200">Estado CP</th>
                </tr>
              </thead>
              <tbody>
                {data.capacidadPorCuenta.map(c => {
                  const pct = c.pctOcupacion
                  const barColor = pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  const cpColor  = c.varianteCp === 'vencida' ? 'text-red-600 font-semibold'
                                 : c.varianteCp === 'alerta'  ? 'text-amber-600 font-semibold'
                                 : 'text-emerald-600'
                  return (
                    <tr key={c.cuentaId} className={`border-b border-gray-50 hover:bg-gray-50 ${c.varianteCp === 'vencida' ? 'bg-red-50' : c.varianteCp === 'alerta' ? 'bg-amber-50' : ''}`}>
                      <td className="px-3 py-2 font-mono font-bold text-brand-accent">{c.cuentaId}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[140px] truncate">{c.nombre || <span className="text-gray-400 italic">—</span>}</td>
                      <td className="px-3 py-2 text-center font-medium">{c.capacidad}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{c.ocupadas}</td>
                      <td className="px-3 py-2 text-center text-emerald-700 font-medium">{c.libres}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                            <div className={`${barColor} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-gray-600 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {c.varianteCp === 'sin_fecha'
                          ? <span className="text-gray-400">Sin fecha</span>
                          : <span className={cpColor}>
                              {c.varianteCp === 'vencida' ? 'Vencida' : c.varianteCp === 'alerta' ? `${c.diasAlFin}d` : `${c.diasAlFin}d`}
                            </span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="pl-glass pl-a3 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, apellido, cuenta, nickname, ID…"
              className="pl-search w-full pl-9 pr-3 py-2.5 text-sm text-gray-800 placeholder-gray-400"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="pl-select px-3 py-2.5 text-sm text-gray-800"
          >
            <option value="ALL">Todos los estados</option>
            <option value="vigente">Vigente</option>
            <option value="alerta">Alerta (próx. vencer)</option>
            <option value="cortesia">Cortesía</option>
            <option value="vencido">Vencido</option>
            <option value="libre">Libre</option>
          </select>
          <span className="text-sm text-purple-400 whitespace-nowrap font-semibold">{rows.length} filas</span>
          <button
            onClick={() => setShowEstatusPanel(p => !p)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
              showEstatusPanel
                ? 'pl-estatus-btn-active'
                : 'border border-purple-200 bg-white/80 text-purple-700 hover:bg-purple-50 hover:border-purple-400'
            )}
          >
            <Users size={14} />
            Estatus Cliente
          </button>
        </div>
      </div>

      {/* Comprobante de renovación (desde Estatus Cliente) */}
      {comprobanteRow && (
        <ComprobanteModal row={comprobanteRow} onClose={() => setComprobanteRow(null)} />
      )}

      {/* Panel Estatus Cliente — overlay flotante */}
      {showEstatusPanel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm overflow-auto"
          onClick={e => { if (e.target === e.currentTarget) setShowEstatusPanel(false) }}
        >
          <div className={cn(
            'relative flex flex-col my-auto rounded-xl shadow-2xl bg-white transition-all duration-300',
            estatusExpanded
              ? 'w-[calc(100vw-2rem)]'
              : 'w-max max-w-[calc(100vw-2rem)]'
          )}>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-brand-accent flex-shrink-0">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-white/80" />
              <span className="font-semibold text-white text-sm tracking-wide">Estatus Cliente</span>
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                {rows.length} {rows.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopiarImagenEstatus}
                disabled={copiandoImg}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
                title="Copiar como imagen — mismo formato del panel"
              >
                {copiandoImg
                  ? <Loader2 size={15} className="animate-spin" />
                  : copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <button
                onClick={() => { setShowCuentaData(p => !p); if (showCuentaData) setShowEstatusPwd(false) }}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  showCuentaData
                    ? 'bg-brand-primary text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
                )}
              >
                <KeyRound size={12} />
                Datos de cuenta
              </button>
              {showCuentaData && (
                <button
                  onClick={() => setShowEstatusPwd(p => !p)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white/80 hover:bg-white/20 border border-white/20 transition-colors"
                >
                  {showEstatusPwd ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showEstatusPwd ? 'Ocultar' : 'Mostrar'} claves
                </button>
              )}
              <button
                onClick={() => setEstatusExpanded(p => !p)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white/80 hover:bg-white/20 border border-white/20 transition-colors"
              >
                {estatusExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                {estatusExpanded ? 'Comprimir' : 'Expandir'}
              </button>
              <button
                onClick={() => setShowEstatusPanel(false)}
                className="ml-1 text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div ref={estatusTablaRef} className={cn(
            'overflow-auto [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ui-border hover:[&::-webkit-scrollbar-thumb]:bg-brand-light',
            estatusExpanded ? 'max-h-[80vh]' : 'max-h-[58vh]'
          )}>
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr className="text-white text-left">
                  {showCuentaData && (<>
                    <th className="sticky top-0 z-10 bg-blue-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">ID Cuenta</th>
                    <th className="sticky top-0 z-10 bg-blue-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Cuenta</th>
                    <th className="sticky top-0 z-10 bg-blue-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Contraseña</th>
                  </>)}
                  <th className="sticky top-0 z-10 bg-emerald-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Nombre</th>
                  <th className="sticky top-0 z-10 bg-emerald-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Apellido</th>
                  <th className="sticky top-0 z-10 bg-emerald-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Pantalla</th>
                  <th className="sticky top-0 z-10 bg-emerald-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Customer ID</th>
                  <th className="sticky top-0 z-10 bg-emerald-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Nickname</th>
                  <th className="sticky top-0 z-10 bg-purple-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Tipo Plan</th>
                  <th className="sticky top-0 z-10 bg-purple-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Ini. Real</th>
                  <th className="sticky top-0 z-10 bg-purple-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Fin Real</th>
                  <th className="sticky top-0 z-10 bg-purple-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Mes R.</th>
                  <th className="sticky top-0 z-10 bg-purple-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Estado R.</th>
                  <th className="sticky top-0 z-10 bg-purple-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Alerta R.</th>
                  <th className="sticky top-0 z-10 bg-slate-600 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Debe</th>
                  <th data-nocapture className="sticky top-0 z-10 bg-orange-600 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const rv = getRowVariant(row, stats.diasAlerta)
                  const diasR = calcDias(row.duracionReal) ?? row.diasVencimientoReal
                  const tipoPlan = (() => {
                    if (row.tipoPlan) return { label: row.tipoPlan, variant: 'orange' }
                    const d = row.duracionPlan != null ? Math.floor(Number(row.duracionPlan)) : null
                    if (d === 14) return { label: 'Plan Anual', variant: 'success' }
                    if (d === 7)  return { label: 'Plan Semestral', variant: 'warning' }
                    if (d === 1)  return { label: 'Plan Mensual', variant: 'neutral' }
                    return d != null ? { label: 'REVISAR', variant: 'error' } : null
                  })()
                  return (
                    <tr key={`es-${row.idPantalla}-${i}`} className={cn(ROW_BG[rv], 'transition-colors')}>
                      {showCuentaData && (<>
                        <td className="px-3 py-2 font-mono font-bold text-brand-accent whitespace-nowrap border-b border-gray-100">{row.cuentaId}</td>
                        <td className="px-3 py-2 font-mono text-gray-700 whitespace-nowrap border-b border-gray-100">{row.cuenta}</td>
                        <td className="px-3 py-2 whitespace-nowrap border-b border-gray-100">
                          {showEstatusPwd
                            ? <span className="font-mono text-gray-700">{row.password}</span>
                            : <span className="text-gray-400 tracking-widest select-none">••••••</span>}
                        </td>
                      </>)}
                      <td className="px-3 py-2 font-medium text-brand-accent whitespace-nowrap border-b border-gray-100">{row.nombre || <span className="text-gray-400 italic">—</span>}</td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap border-b border-gray-100">{row.apellido || <span className="text-gray-400 italic">—</span>}</td>
                      <td className="px-3 py-2 font-mono font-bold text-brand-primary whitespace-nowrap border-b border-gray-100">{row.idPantalla}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap border-b border-gray-100">{row.customerId || '—'}</td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap border-b border-gray-100">{row.nickname || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap border-b border-gray-100">
                        {tipoPlan ? <Badge variant={tipoPlan.variant}>{tipoPlan.label}</Badge> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap border-b border-gray-100">{row.inicioReal ? formatDate(row.inicioReal) : '—'}</td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap border-b border-gray-100">{row.duracionReal ? formatDate(row.duracionReal) : '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap border-b border-gray-100"><MonthsChip dias={diasR} /></td>
                      <td className="px-3 py-2 whitespace-nowrap border-b border-gray-100">
                        {row.estadoReal ? <Badge variant={estadoBadgeVariant(row.estadoReal)}>{row.estadoReal}</Badge> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap border-b border-gray-100">
                        {row.alertaReal ? <Badge variant={estadoBadgeVariant(row.alertaReal)}>{row.alertaReal}</Badge> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap border-b border-gray-100">
                        {row.debe
                          ? (
                            <div className="flex flex-col items-start gap-0.5">
                              {!row.montoDebe && !row.montoDebeUSD && <Badge variant="error">Debe</Badge>}
                              {row.montoDebe > 0 && <Badge variant="error">{formatCurrency(row.montoDebe)}</Badge>}
                              {row.montoDebeUSD > 0 && <Badge variant="error">US${Number(row.montoDebeUSD).toLocaleString('en-US')}</Badge>}
                            </div>
                          )
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td data-nocapture className="px-3 py-2 whitespace-nowrap border-b border-gray-100 text-center">
                        <button
                          onClick={() => setComprobanteRow(row)}
                          disabled={!row.nickname}
                          title={row.nickname ? 'Generar comprobante — si está vencido o próximo a vencer incluye el mensaje de renovación para WhatsApp' : 'Sin nickname — no hay pagos que consultar'}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all',
                            row.nickname
                              ? 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                              : 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed'
                          )}
                        >
                          <Receipt size={12} />
                          Generar
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={showCuentaData ? 16 : 13} className="px-4 py-10 text-center text-gray-400">Sin resultados con el filtro actual</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pie del panel */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-ui-border bg-slate-50 text-xs text-gray-500 flex-shrink-0">
            <span>{rows.length} registro{rows.length !== 1 ? 's' : ''} · filtro: <strong className="text-brand-accent">{filterStatus === 'ALL' ? 'todos los estados' : filterStatus}</strong></span>
            <button
              onClick={() => setEstatusExpanded(p => !p)}
              className="flex items-center gap-1 text-gray-400 hover:text-brand-accent transition-colors"
            >
              {estatusExpanded ? <><Minimize2 size={11} /> Vista compacta</> : <><Maximize2 size={11} /> Pantalla completa</>}
            </button>
          </div>
          </div>{/* cierre .relative.flex-col */}
        </div>
      )}

      {/* ── Tabla compartida — cualquier cambio en PlanificadorTable.jsx
              se refleja aquí y en SubscriptionsPage automáticamente ── */}
      <Card className="overflow-hidden">
        <PlanificadorTable
          rows={rows}
          stats={stats}
          sortConfig={sortConfig}
          onSort={onSort}
          hidePwd={hidePwd}
          onTogglePwd={togglePwd}
          onEdit={(row) => { snapshotBeforeChange(); setEditRow(row) }}
          onDelete={handleDelete}
        />
      </Card>
    </div>
  )
}
