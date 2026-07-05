import { useState, useMemo, useEffect } from 'react'
import { todayStr } from '../../utils/dateUtils'
import {
  Search, Plus, Pencil, Trash2, X, Upload,
  DollarSign, Monitor, TrendingUp, BarChart3,
  ChevronUp, ChevronDown, ChevronsUpDown,
  CalendarClock, Package, Zap, Lightbulb, Sparkles,
} from 'lucide-react'
import api from '../../config/api'
import { useApiResource } from '../../hooks/useApiResource'
import { useUi } from '../../context/UiContext'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { formatDate, formatCurrency, formatUSD, formatNumber } from '../../utils/excelUtils'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, Cell, ReferenceLine } from 'recharts'
import { ChartInsight } from './dashboard/biShared'

const MES_ORDEN = {
  ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
  JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
}
const MES_ABREV = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ colKey, sortCol, sortDir }) {
  if (sortCol !== colKey) return <ChevronsUpDown size={13} className="opacity-40 flex-shrink-0" />
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="flex-shrink-0" />
    : <ChevronDown size={13} className="flex-shrink-0" />
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtCOP = (v) => (v == null || v === '' ? '—' : formatCurrency(v))
const fmtUSD = (v) => (v == null || v === '' ? '—' : formatUSD(v))
const fmtNum = (v) => (v == null || v === '' ? '—' : formatNumber(v))

const CSS = `
  @keyframes cp-fade-up { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes cp-orb-1   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes cp-orb-2   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  @keyframes cp-drawer-in { from { transform:translateX(100%) } to { transform:translateX(0) } }
  @keyframes cp-fade-in { from { opacity:0 } to { opacity:1 } }
  .cp-a1 { animation: cp-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .cp-a2 { animation: cp-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .cp-orb-1 { animation: cp-orb-1 8s ease-in-out infinite }
  .cp-orb-2 { animation: cp-orb-2 11s ease-in-out infinite }
  .cp-cta {
    background: linear-gradient(135deg, #f97316, #ea580c);
    box-shadow: 0 4px 18px rgba(249,115,22,.4);
    transition: all .22s ease; border: none;
  }
  .cp-cta:hover { box-shadow: 0 7px 24px rgba(249,115,22,.55); transform: translateY(-2px) }
  .cp-overlay { animation: cp-fade-in .2s ease both }
  .cp-drawer { animation: cp-drawer-in .3s cubic-bezier(.22,1,.36,1) both }
  @media (prefers-reduced-motion: reduce) {
    .cp-a1, .cp-a2, .cp-orb-1, .cp-orb-2, .cp-overlay, .cp-drawer { animation: none !important; transition: none !important }
  }
`

function CostoCard({ icon: Icon, label, value, sub, variant, onClick }) {
  const isSolid = variant === 'solid'
  const isOutline = variant === 'outline'
  
  const containerClass = `relative bg-white rounded-2xl overflow-hidden select-none transition-all duration-300
    ${isSolid ? 'shadow-md border border-slate-100' : isOutline ? 'bg-orange-50 border border-orange-200' : 'border border-slate-200 shadow-sm'}
    ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50' : ''}`

  const topBorder = isSolid 
    ? 'linear-gradient(90deg, #f97316, #ea580c)'
    : 'linear-gradient(90deg, #fdba7480, #f9731680)'

  return (
    <div className={containerClass} onClick={onClick}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: topBorder }} />
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[10px] font-bold tracking-[.14em] uppercase mb-1 ${isOutline ? 'text-orange-600' : 'text-slate-400'}`}>
            {label}
          </p>
          <p className="text-3xl font-extrabold text-slate-800 tabular-nums leading-none mt-1">
            {value}
          </p>
          {sub && (
            <p className={`text-xs mt-2 font-medium ${isOutline ? 'text-orange-600' : 'text-slate-500'}`}>
              {sub}
            </p>
          )}
          {onClick && (
            <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors">
              <span>¿Cómo se calcula?</span>
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${isSolid ? 'bg-orange-50 text-orange-600' : 'bg-orange-50 text-orange-600'}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

// ─── Proyección: componentes y helpers ────────────────────────────────────────

const SALDO_INICIAL = 27
const DIAS_ALERTA_CP = 30

function diasHasta(fecha) {
  if (!fecha) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(fecha); if (isNaN(d)) return null
  d.setHours(0, 0, 0, 0)
  return Math.round((d - today) / 86400000)
}

function SmartTagCP({ tone = 'info', children }) {
  const s = { good: 'bg-emerald-100 text-emerald-700', warn: 'bg-amber-100 text-amber-700', bad: 'bg-red-100 text-red-700', info: 'bg-sky-100 text-sky-700' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${s[tone]}`}>
      <Sparkles size={10} />{children}
    </span>
  )
}

function BiCardCP({ icon: Icon, label, value, sub, variant = 'light', tag }) {
  const styles = { solid: 'bg-gradient-to-br from-sky-500 to-sky-700 text-white', light: 'bg-white border-2 border-sky-200 text-sky-700', outline: 'bg-sky-50 border border-sky-300 text-sky-800' }
  const iconBg  = { solid: 'bg-white/20', light: 'bg-sky-100', outline: 'bg-sky-200/60' }
  return (
    <div className={`${styles[variant]} rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${variant === 'solid' ? 'opacity-90' : ''}`}>{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {tag && <div className="mt-1.5"><SmartTagCP tone={tag.tone}>{tag.text}</SmartTagCP></div>}
          {sub && <p className={`text-xs mt-1 ${variant === 'solid' ? 'opacity-75' : 'text-gray-400'}`}>{sub}</p>}
        </div>
        <div className={`${iconBg[variant]} rounded-lg p-3`}><Icon size={22} /></div>
      </div>
    </div>
  )
}

function ChartInsightCP({ text }) {
  if (!text) return null
  return (
    <div className="mt-3 flex gap-2.5 bg-sky-50/70 border border-sky-100 rounded-lg px-3.5 py-2.5">
      <Lightbulb size={16} className="text-sky-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-gray-600 leading-relaxed">
        {text.split('**').map((chunk, j) => j % 2 === 1 ? <strong key={j} className="text-gray-800">{chunk}</strong> : chunk)}
      </p>
    </div>
  )
}

function CpMesDetalleModal({ data, onClose }) {
  if (!data) return null
  const { label, cps, packsReales, saldoAntes, saldoDespues } = data
  const creditos = cps.length * 6
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-t-2xl px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CalendarClock size={20} /> Cuentas padre · {label}
            </h2>
            <p className="text-indigo-200 text-sm">
              {cps.length} cuenta{cps.length !== 1 ? 's' : ''} · {creditos} créditos · Saldo antes: {saldoAntes} Cr
              {packsReales > 0
                ? ` → comprar ${packsReales} pack${packsReales !== 1 ? 's' : ''} · Saldo después: ${saldoDespues} Cr`
                : ` → cubierto con saldo · Saldo después: ${saldoDespues} Cr`}
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs text-gray-500 bg-gray-50">
                {['ID Cuenta','Usuario IPTV','Crédito','Inicio','Vencimiento','Días','SmartTV','Estado'].map(h => (
                  <th key={h} className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold border-b border-gray-200 text-center first:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cps.map(cp => {
                const dias = diasHasta(cp.fechaFin)
                const vencida = dias != null && dias <= 0
                const alerta  = dias != null && dias > 0 && dias <= DIAS_ALERTA_CP
                return (
                  <tr key={cp.cuentaId}
                    className={`border-b border-gray-50 hover:bg-indigo-50 transition-colors ${vencida ? 'bg-red-50' : alerta ? 'bg-amber-50' : ''}`}
                  >
                    <td className="px-4 py-2.5 font-mono font-bold text-orange-700">{cp.cuentaId}</td>
                    <td className="px-4 py-2.5 text-center text-gray-700">{cp.nombreUsuario || <span className="text-gray-400 italic">—</span>}</td>
                    <td className="px-4 py-2.5 text-center font-semibold">{cp.credito ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center text-xs whitespace-nowrap text-gray-500">{cp.fechaInicio ? formatDate(cp.fechaInicio) : '—'}</td>
                    <td className="px-4 py-2.5 text-center text-xs whitespace-nowrap">
                      <span className={`font-semibold ${vencida ? 'text-red-600' : alerta ? 'text-amber-600' : 'text-gray-700'}`}>
                        {cp.fechaFin ? formatDate(cp.fechaFin) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {dias != null
                        ? <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${vencida ? 'bg-red-100 text-red-700' : alerta ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {vencida ? `${Math.abs(dias)}d venc.` : `${dias}d`}
                          </span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-600">{cp.smartTv || '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      {cp.estado
                        ? <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cp.estado === 'Válido' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{cp.estado}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Package size={12} className="text-orange-500" />
            {cps.length} cuenta{cps.length !== 1 ? 's' : ''} × 6 Cr = <strong className="text-gray-600">{creditos} créditos</strong>
            {packsReales > 0
              ? <> · Saldo {saldoAntes} Cr → comprar <strong className="text-orange-600">{packsReales} pack{packsReales !== 1 ? 's' : ''}</strong> · Quedan <strong className="text-indigo-600">{saldoDespues} Cr</strong></>
              : <> · Cubierto con saldo ({saldoAntes} Cr → quedan <strong className="text-indigo-600">{saldoDespues} Cr</strong>)</>}
          </p>
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function ProyeccionTooltip({ active, payload, label, hayCost, fmtC }) {
  if (!active || !payload?.length) return null
  const m = payload[0]?.payload
  if (!m) return null
  return (
    <div className="bg-white border border-indigo-100 rounded-xl shadow-xl px-4 py-3 text-xs min-w-[200px]">
      <p className="font-bold text-gray-800 mb-2 text-sm border-b border-gray-100 pb-1.5">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500">CPs que vencen</span>
          <span className={`font-bold ${m.packs100 > 0 ? 'text-orange-600' : 'text-indigo-600'}`}>{m.cuentas}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500">Créditos necesarios</span>
          <span className="font-semibold text-gray-700">{m.creditos} Cr</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500">Saldo antes</span>
          <span className="font-semibold text-indigo-500">{m.saldoAntes} Cr</span>
        </div>
        {m.packs100 > 0 ? (
          <div className="flex items-center justify-between gap-4 bg-orange-50 rounded px-2 py-1">
            <span className="text-orange-600 font-semibold">Comprar packs</span>
            <span className="font-bold text-orange-600">{m.packs100} × 100 Cr</span>
          </div>
        ) : m.cuentas > 0 ? (
          <div className="text-emerald-600 font-semibold text-center bg-emerald-50 rounded py-1">✓ Cubierto con saldo</div>
        ) : null}
        <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-1.5">
          <span className="text-emerald-600 font-semibold">Saldo después</span>
          <span className={`font-bold ${m.saldoDespues <= 0 ? 'text-red-600' : m.saldoDespues < 12 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {m.saldoDespues} Cr
          </span>
        </div>
        {hayCost && m.costoCOP > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500">Costo estimado</span>
            <span className="font-bold text-red-500">{fmtC(m.costoCOP)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function narrarProyeccion(proyeccion, precioPack100) {
  if (!proyeccion?.length) return null
  const total = proyeccion.reduce((s, m) => s + m.cuentas, 0)
  if (total === 0) return 'Ninguna cuenta padre tiene fecha de vencimiento en los próximos 12 meses.'
  const mesPico = proyeccion.reduce((best, m) => m.cuentas > best.cuentas ? m : best, proyeccion[0])
  const totalCreditos = proyeccion.reduce((s, m) => s + m.creditos, 0)
  const totalPacks = proyeccion.reduce((s, m) => s + m.packs100, 0)
  const totalCOP = proyeccion.reduce((s, m) => s + m.costoCOP, 0)
  const mesesConCompra = proyeccion.filter(m => m.packs100 > 0).length
  const primerCompra = proyeccion.find(m => m.packs100 > 0)
  const mesesCubiertos = primerCompra ? proyeccion.findIndex(m => m.packs100 > 0) : proyeccion.length
  const hayPrecio = precioPack100 > 0
  const fmtC = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
  const coberturaTxt = mesesCubiertos > 0
    ? ` Los **${SALDO_INICIAL} Cr actuales cubren los primeros ${mesesCubiertos} mes${mesesCubiertos !== 1 ? 'es' : ''} sin compras adicionales${primerCompra ? ` — primera recarga en **${primerCompra.mesLabel}**` : ''}.`
    : ` El saldo actual (${SALDO_INICIAL} Cr) no alcanza para el primer mes — se necesita compra inmediata.`
  return `En los próximos **12 meses**, **${total} cuenta${total !== 1 ? 's' : ''} padre** requerirán recarga (${totalCreditos} créditos).${coberturaTxt} Solo hacen falta **${totalPacks} pack${totalPacks !== 1 ? 's' : ''} de 100 Cr en ${mesesConCompra} mes${mesesConCompra !== 1 ? 'es' : ''}** gracias al arrastre del saldo. Mes pico: **${mesPico.mesLabel}** con **${mesPico.cuentas} cuenta${mesPico.cuentas !== 1 ? 's' : ''}** por vencer.${hayPrecio ? ` Costo estimado: **${fmtC(totalCOP)}** (ref.: ${fmtC(Math.round(precioPack100))} por pack de 100 Cr).` : ' Carga datos de costo para ver la proyección en COP.'}`
}

// ─── Columnas ─────────────────────────────────────────────────────────────────

const COLS = [
  { key: 'idRec',                   label: 'ID Rec' },
  { key: 'accion',                  label: 'Acción' },
  { key: 'creditos',                label: 'Créditos' },
  { key: 'fecha',                   label: 'Fecha' },
  { key: 'anio',                    label: 'Año' },
  { key: 'mes',                     label: 'Mes' },
  { key: 'itemQuantity',            label: 'Cant.' },
  { key: 'costoCOP',                label: 'Costo COP' },
  { key: 'impuesto4x100COP',        label: 'Imp. 4x1000' },
  { key: 'costoUSD',                label: 'Costo USD' },
  { key: 'trm',                     label: 'TRM' },
  { key: 'costoUnitarioCuentaUSD',  label: 'Cto. Unt. Cta USD' },
  { key: 'costoUnitarioCuentaCOP',  label: 'Cto. Unt. Cta COP' },
  { key: 'costoPantallaUSD',        label: 'Cto. Pantalla USD' },
  { key: 'costoPantallaCOP',        label: 'Cto. Pantalla COP' },
  { key: 'medioPago',               label: 'Medio Pago' },
  { key: 'acciones',                label: '' },
]

// ─── Render celda ─────────────────────────────────────────────────────────────

function renderCell(row, key, onEdit, onDelete) {
  const v = row[key]
  switch (key) {
    case 'acciones':
      return (
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(row)} className="p-1.5 rounded-lg text-orange-600 hover:bg-orange-100 transition-colors" title="Editar">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(row.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Eliminar">
            <Trash2 size={14} />
          </button>
        </div>
      )
    case 'fecha':
      return <span className="text-xs text-gray-600 whitespace-nowrap">{v ? formatDate(v) : '—'}</span>
    case 'idRec':
      return <span className="font-mono text-xs font-bold text-orange-700">{v || '—'}</span>
    case 'accion':
      return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
          ${v === 'Recarga' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
          {v || '—'}
        </span>
      )
    case 'costoCOP':
    case 'impuesto4x100COP':
    case 'costoUnitarioCuentaCOP':
    case 'costoPantallaCOP':
      return <span className="font-semibold text-orange-700 whitespace-nowrap">{fmtCOP(v)}</span>
    case 'costoUSD':
    case 'costoUnitarioCuentaUSD':
    case 'costoPantallaUSD':
      return <span className="font-semibold text-green-700 whitespace-nowrap">{fmtUSD(v)}</span>
    case 'trm':
      return <span className="font-mono text-xs whitespace-nowrap">{fmtNum(v)}</span>
    case 'creditos':
    case 'itemQuantity':
      return <span className="block text-center font-medium">{v ?? '—'}</span>
    case 'medioPago':
      return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
          ${v === 'Nequi' ? 'bg-purple-100 text-purple-700'
          : v === 'Bancolombia' ? 'bg-yellow-100 text-yellow-700'
          : 'bg-gray-100 text-gray-500'}`}>
          {v || '—'}
        </span>
      )
    default:
      return v || '—'
  }
}

// ─── Formulario vacío ────────────────────────────────────────────────────────

const EMPTY = {
  idRec: '', accion: 'Recarga', creditos: '', fecha: '',
  anio: '', mes: '', itemQuantity: '1', costoCOP: '',
  impuesto4x100COP: '', costoUSD: '', trm: '',
  costoUnitarioCuentaUSD: '', costoUnitarioCuentaCOP: '',
  costoPantallaUSD: '', costoPantallaCOP: '', medioPago: 'Nequi',
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CostoPantallaPage() {
  const { showToast } = useUi()
  const { data: rows, setData: setRows, loading, error, reload: load } = useApiResource('/admin/payments/costo-pantalla')
  const [search, setSearch]     = useState('')
  const [sortCol, setSortCol]   = useState('id')
  const [sortDir, setSortDir]   = useState('desc')
  const [showForm, setShowForm]         = useState(false)
  const [explain, setExplain]           = useState(null)
  const [editing, setEditing]           = useState(null)
  const [form, setForm]                 = useState(EMPTY)
  const [cpRows, setCpRows]             = useState([])
  const [cpMesModal, setCpMesModal]     = useState(null)

  useEffect(() => {
    api.get('/admin/cuentas-padre')
      .then(r => setCpRows(r.data || []))
      .catch(() => {})
  }, [])

  const { proyeccion, precioPack100 } = useMemo(() => {
    const validos = rows.filter(r => r.creditos > 0 && r.costoCOP > 0)
    const totalCr  = validos.reduce((s, r) => s + Number(r.creditos), 0)
    const totalCOP = validos.reduce((s, r) => s + Number(r.costoCOP), 0)
    const precioPack100 = totalCr > 0 ? (totalCOP / totalCr) * 100 : 0

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const meses = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1)
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        mesLabel: d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
                   .replace('.', '').replace(/^(.)/, c => c.toUpperCase()),
      }
    })

    const grupos = Object.fromEntries(meses.map(m => [m.key, []]))
    ;(cpRows || []).forEach(cp => {
      if (!cp.fechaFin) return
      const fin = new Date(cp.fechaFin); if (isNaN(fin)) return
      fin.setHours(0, 0, 0, 0)
      const key = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}`
      if (grupos[key] !== undefined) grupos[key].push(cp)
    })

    const total12m = meses.reduce((s, { key }) => s + grupos[key].length, 0)

    let saldo = SALDO_INICIAL
    const proyeccion = meses.map(({ key, mesLabel }) => {
      const cpsList    = grupos[key]
      const cuentas    = cpsList.length
      const creditos   = cuentas * 6
      const saldoAntes = saldo
      let packs100 = 0
      if (creditos > 0) {
        if (saldo >= creditos) {
          saldo -= creditos
        } else {
          const deficit = creditos - saldo
          packs100 = Math.ceil(deficit / 100)
          saldo = saldo + packs100 * 100 - creditos
        }
      }
      const saldoDespues = saldo
      const costoCOP     = Math.round(packs100 * precioPack100)
      const pct          = total12m > 0 ? Math.round((cuentas / total12m) * 100) : 0
      return {
        mesLabel, key, cuentas, creditos, packs100, costoCOP, cpsList, pct,
        saldoAntes, saldoDespues,
        labelCuentas: cuentas > 0 ? `${cuentas} (${pct}%)` : '',
        labelPacks:   packs100 > 0 ? `${packs100}` : '',
      }
    })
    return { proyeccion, precioPack100 }
  }, [rows, cpRows])

  const handleSort = (key) => {
    if (key === 'acciones') return
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(key); setSortDir('asc') }
  }

  const handleImport = async () => {
    if (!confirm('¿Re-importar todos los costos desde el Excel? Se reemplazarán los datos existentes.')) return
    try {
      const { data } = await api.post('/admin/payments/costo-pantalla/import')
      showToast(data.message, 'success')
      load()
    } catch (e) { showToast(e.response?.data?.error || e.message, 'error') }
  }

  const openNew = async () => {
    setEditing(null)
    setForm({ ...EMPTY, fecha: todayStr() })
    setShowForm(true)
    
    try {
      const { data } = await api.get('/admin/payments/costo-pantalla/next-id')
      if (data.nextIdRec) {
        setForm(prev => ({ ...prev, idRec: data.nextIdRec }))
      }
    } catch (e) {
      console.error('No se pudo obtener el siguiente ID', e)
    }
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({ ...EMPTY, ...row })
    setShowForm(true)
  }

  const closeForm = () => setShowForm(false)

  const f = (field) => (e) => {
    const val = e.target.value
    setForm(prev => {
      const next = { ...prev, [field]: val }
      
      // Auto-calc impuesto 4x1000
      if (field === 'costoCOP') {
        const costo = parseFloat(val) || 0
        next.impuesto4x100COP = String(Math.round(costo * 0.004))
      }
      
      let updatedTRM = next.trm
      let updatedCtoUSD = next.costoUnitarioCuentaUSD
      let updatedCtoPantallaUSD = next.costoPantallaUSD

      // Auto-calc TRM (Costo COP / Costo USD)
      if (field === 'costoCOP' || field === 'costoUSD') {
        const cCop = parseFloat(next.costoCOP) || 0
        const cUsd = parseFloat(next.costoUSD) || 0
        if (cCop > 0 && cUsd > 0) {
          updatedTRM = String((cCop / cUsd).toFixed(2))
          next.trm = updatedTRM
        } else if (val === '') {
          updatedTRM = ''
          next.trm = ''
        }
      }

      // Auto-calc Cto. Unit. Cuenta USD (Costo USD / Créditos)
      if (field === 'costoUSD' || field === 'creditos') {
        const cUsd = parseFloat(next.costoUSD) || 0
        const cred = parseFloat(next.creditos) || 0
        if (cUsd > 0 && cred > 0) {
          updatedCtoUSD = String((cUsd / cred).toFixed(2))
          next.costoUnitarioCuentaUSD = updatedCtoUSD
        } else if (val === '') {
          updatedCtoUSD = ''
          next.costoUnitarioCuentaUSD = ''
        }
      }

      // Auto-calc Cto. Unit. Cuenta COP (TRM * Cto. Unit. Cuenta USD)
      if (field === 'trm' || field === 'costoUnitarioCuentaUSD' || field === 'costoCOP' || field === 'costoUSD' || field === 'creditos') {
        const t = parseFloat(updatedTRM) || 0
        const cuUsd = parseFloat(updatedCtoUSD) || 0
        if (t > 0 && cuUsd > 0) {
          next.costoUnitarioCuentaCOP = String(Math.round(t * cuUsd))
        } else if (val === '') {
          next.costoUnitarioCuentaCOP = ''
        }
      }

      // Auto-calc Cto. Pantalla USD (Cto. Unit. Cuenta USD / 3)
      if (field === 'costoUnitarioCuentaUSD' || field === 'costoUSD' || field === 'creditos') {
        const cuUsd = parseFloat(updatedCtoUSD) || 0
        if (cuUsd > 0) {
          updatedCtoPantallaUSD = String((cuUsd / 3).toFixed(2))
          next.costoPantallaUSD = updatedCtoPantallaUSD
        } else if (val === '') {
          updatedCtoPantallaUSD = ''
          next.costoPantallaUSD = ''
        }
      }

      // Auto-calc Cto. Pantalla COP (Cto. Pantalla USD * TRM)
      if (field === 'trm' || field === 'costoPantallaUSD' || field === 'costoUnitarioCuentaUSD' || field === 'costoCOP' || field === 'costoUSD' || field === 'creditos') {
        const t = parseFloat(updatedTRM) || 0
        const cpUsd = parseFloat(updatedCtoPantallaUSD) || 0
        if (t > 0 && cpUsd > 0) {
          next.costoPantallaCOP = String(Math.round(t * cpUsd))
        } else if (val === '') {
          next.costoPantallaCOP = ''
        }
      }

      // Auto-calc fecha → año y mes
      if (field === 'fecha' && val) {
        next.anio = val.slice(0, 4)
        const months = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']
        next.mes = months[parseInt(val.slice(5, 7), 10) - 1] || ''
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const { data } = await api.put(`/admin/payments/costo-pantalla/${editing.id}`, form)
        setRows(prev => prev.map(r => r.id === editing.id ? data : r))
        showToast('Registro de costo actualizado correctamente.', 'success')
      } else {
        const { data } = await api.post('/admin/payments/costo-pantalla', form)
        setRows(prev => [data, ...prev])
        showToast('Registro de costo creado correctamente.', 'success')
      }
      closeForm()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm(`¿Eliminar el registro #${id}?`)) return
    try {
      await api.delete(`/admin/payments/costo-pantalla/${id}`)
      setRows(prev => prev.filter(r => r.id !== id))
      showToast('Registro de costo eliminado correctamente.', 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const stats = useMemo(() => {
    const total         = rows.length
    const totalCostoCOP = rows.reduce((s, r) => s + (Number(r.costoCOP) || 0), 0)
    const totalImpuesto = rows.reduce((s, r) => s + (Number(r.impuesto4x100COP) || 0), 0)
    const totalCostoUSD = rows.reduce((s, r) => s + (Number(r.costoUSD) || 0), 0)
    const totalCreditos = rows.reduce((s, r) => s + (Number(r.creditos) || 0), 0)
    return { total, totalCostoCOP, totalImpuesto, totalConImpuesto: totalCostoCOP + totalImpuesto, totalCostoUSD, totalCreditos }
  }, [rows])

  // Serie mensual: costo total (con 4x1000) + TRM promedio — la misma
  // agregación que usan el Dashboard y Análisis Financiero como "OPEX".
  const serieMensualCosto = useMemo(() => {
    const map = {}
    for (const r of rows) {
      const m = MES_ORDEN[(r.mes || '').toString().trim().toUpperCase()] || 0
      if (!m || !r.anio) continue
      const key = `${r.anio}-${String(m).padStart(2, '0')}`
      if (!map[key]) map[key] = { key, costo: 0, trmSum: 0, trmN: 0 }
      map[key].costo += (Number(r.costoCOP) || 0) + (Number(r.impuesto4x100COP) || 0)
      if (Number(r.trm) > 0) { map[key].trmSum += Number(r.trm); map[key].trmN += 1 }
    }
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).map(x => {
      const [anio, mm] = x.key.split('-')
      return {
        label: `${MES_ABREV[Number(mm)]} ${anio.slice(2)}`,
        costo: Math.round(x.costo),
        trm: x.trmN > 0 ? Math.round(x.trmSum / x.trmN) : null,
      }
    })
  }, [rows])

  const filtered = useMemo(() => {
    let result = rows
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(r =>
        (r.idRec || '').toLowerCase().includes(s) ||
        (r.accion || '').toLowerCase().includes(s) ||
        (r.mes || '').toLowerCase().includes(s) ||
        (r.anio || '').toString().includes(s) ||
        (r.medioPago || '').toLowerCase().includes(s)
      )
    }
    return [...result].sort((a, b) => {
      let va = a[sortCol] ?? ''
      let vb = b[sortCol] ?? ''
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va
      }
      va = String(va).toLowerCase()
      vb = String(vb).toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, search, sortCol, sortDir])

  return (
    <div>
      <style>{CSS}</style>

      {/* ── HERO HEADER ── */}
      <div className="cp-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#7c2d12 0%,#431407 100%)' }}>
        <div className="cp-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#f97316,transparent 70%)' }} />
        <div className="cp-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.15] pointer-events-none" style={{ background: 'radial-gradient(circle,#ea580c,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/25 mb-4">
              <DollarSign size={12} className="text-orange-300" />
              <span className="text-orange-300 text-xs font-semibold tracking-widest uppercase">Finanzas</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Costo Pantalla
            </h1>
            <p className="text-orange-100/70 text-sm mt-2">
              Control de costos por recarga IPTV · {stats.total.toLocaleString()} registros
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleImport} className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-bold text-white transition-all flex items-center gap-2">
              <Upload size={16} /> Importar Excel
            </button>
            <button onClick={openNew} className="cp-cta px-5 py-2.5 rounded-2xl text-sm font-bold text-white flex items-center gap-2">
              <Plus size={18} /> Nueva Recarga
            </button>
          </div>
        </div>
      </div>

      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />
      <CpMesDetalleModal data={cpMesModal} onClose={() => setCpMesModal(null)} />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 cp-a2">
        <CostoCard icon={Monitor}     label="Total Recargas"    value={stats.total.toLocaleString()}        variant="solid"   sub="Histórico completo"
          onClick={() => setExplain({
            title: 'Total Recargas', value: stats.total.toLocaleString(), icon: Monitor,
            queEs: 'Cuántas compras de créditos se han hecho en el histórico — cada recarga es una transacción con el proveedor de IPTV.',
            comoSeCalcula: 'Conteo simple de los registros de este módulo.',
            origen: 'Tabla de costos de pantalla de este módulo.',
          })} />
        <CostoCard icon={DollarSign}  label="Total Costo COP"   value={fmtCOP(stats.totalCostoCOP)}        variant="light"   sub="Sin impuesto 4x1000"
          onClick={() => setExplain({
            title: 'Total Costo COP', value: fmtCOP(stats.totalCostoCOP), icon: DollarSign,
            queEs: 'Lo pagado en pesos por las recargas, **sin incluir** el impuesto 4x1000 de las transferencias.',
            comoSeCalcula: 'Se suma el campo **Costo COP** de cada recarga. Ojo: el Dashboard y Análisis Financiero reportan el costo **con** impuesto — esa cifra es la tarjeta "Costo Total" de al lado.',
            origen: 'Campo Costo COP de cada registro de este módulo.',
          })} />
        <CostoCard icon={DollarSign}  label="Costo Total (+4x1000)" value={fmtCOP(stats.totalConImpuesto)}  variant="outline" sub="La cifra del Dashboard"
          onClick={() => setExplain({
            title: 'Costo Total (+4x1000)', value: fmtCOP(stats.totalConImpuesto), icon: DollarSign,
            queEs: 'El costo real completo de operar: recargas más el impuesto 4x1000 que cobra el banco por cada transferencia.',
            comoSeCalcula: '**Costo COP + impuesto 4x1000** de cada recarga, sumados. Esta es exactamente la cifra que el Dashboard muestra como "Costos históricos" y Análisis Financiero como "OPEX" — así todo coincide entre módulos.',
            origen: `Campos Costo COP (${fmtCOP(stats.totalCostoCOP)}) + Imp. 4x1000 (${fmtCOP(stats.totalImpuesto)}) de este módulo.`,
          })} />
        <CostoCard icon={TrendingUp}  label="Total Costo USD"   value={fmtUSD(stats.totalCostoUSD)}        variant="light" sub="Inversión en dólares"
          onClick={() => setExplain({
            title: 'Total Costo USD', value: fmtUSD(stats.totalCostoUSD), icon: TrendingUp,
            queEs: 'Lo pagado en dólares por las recargas — el proveedor cobra en USD y la TRM del día define cuántos pesos cuesta.',
            comoSeCalcula: 'Se suma el campo **Costo USD** de cada recarga. La relación con el costo en pesos es la TRM: Costo COP ÷ Costo USD.',
            origen: 'Campo Costo USD de cada registro de este módulo.',
          })} />
        <CostoCard icon={BarChart3}   label="Total Créditos"    value={stats.totalCreditos.toLocaleString()} variant="light"  sub="Créditos comprados"
          onClick={() => setExplain({
            title: 'Total Créditos', value: stats.totalCreditos.toLocaleString(), icon: BarChart3,
            queEs: 'Cuántos créditos (cupos de cuenta) se han comprado en total — la "materia prima" que luego se convierte en pantallas vendibles.',
            comoSeCalcula: 'Se suma el campo **Créditos** de cada recarga. Cada crédito habilita una cuenta que suele soportar 3 pantallas.',
            origen: 'Campo Créditos de cada registro de este módulo.',
          })} />
      </div>

      {/* Búsqueda */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ID, acción, mes, año, medio pago…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-orange-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Tabla */}
      <Card className="shadow-lg border-orange-100 overflow-hidden mb-6">
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3" />
              <p className="text-gray-500">Cargando costos…</p>
            </div>
          ) : error ? (
            <p className="p-8 text-center text-red-500">{error}</p>
          ) : (
            <div className="overflow-auto max-h-[34rem] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-200 hover:[&::-webkit-scrollbar-thumb]:bg-orange-300">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-white">
                    {COLS.map(col => (
                      <th
                        key={col.key}
                        scope="col"
                        onClick={() => handleSort(col.key)}
                        className={`sticky top-0 z-10 bg-orange-600 px-3 py-3 font-semibold whitespace-nowrap transition-colors select-none shadow-[0_1px_0_0_rgba(0,0,0,0.08)] ${col.key !== 'acciones' ? 'cursor-pointer hover:bg-orange-700' : ''}`}
                      >
                        {col.key !== 'acciones' ? (
                          <div className="flex items-center gap-1">
                            {col.label}
                            <SortIcon colKey={col.key} sortCol={sortCol} sortDir={sortDir} />
                          </div>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr
                      key={row.id}
                      className={`border-b border-orange-50 hover:bg-orange-50/70 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}`}
                    >
                      {COLS.map(col => (
                        <td key={col.key} className="px-3 py-2 whitespace-nowrap">
                          {renderCell(row, col.key, openEdit, handleDelete)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={COLS.length} className="px-4 py-12 text-center text-gray-400">
                        No se encontraron registros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
        <div className="flex items-center justify-between border-t border-orange-100 bg-orange-50/40 px-4 py-2 text-xs text-gray-500">
          <span>{filtered.length.toLocaleString()} de {rows.length.toLocaleString()} registros</span>
          <span>Ordenado por <strong className="text-brand-accent">{COLS.find(c => c.key === sortCol)?.label ?? sortCol}</strong> ({sortDir === 'asc' ? '↑ ascendente' : '↓ descendente'})</span>
        </div>
      </Card>

      {/* ─── Evolución mensual del costo (OPEX) y TRM ─────────────────────── */}
      {serieMensualCosto.length >= 2 && (
        <Card className="border-orange-100 mb-6">
          <CardHeader className="border-orange-50">
            <CardTitle>Evolución mensual del costo (con 4x1000) y TRM</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Barras = costo total del mes (la misma serie "OPEX" de Análisis Financiero) · Línea azul = TRM promedio pagada</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={serieMensualCosto} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716c' }} interval="preserveStartEnd" />
                <YAxis yAxisId="cop" tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}K`} tick={{ fontSize: 10, fill: '#78716c' }} width={52} />
                <YAxis yAxisId="trm" orientation="right" tickFormatter={(v) => `$${v.toLocaleString('es-CO')}`} tick={{ fontSize: 10, fill: '#78716c' }} width={54} domain={['auto', 'auto']} />
                <Tooltip formatter={(v, name) => name === 'TRM promedio' ? [`$${Number(v).toLocaleString('es-CO')}`, name] : [formatCurrency(v), name]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="cop" dataKey="costo" name="Costo total" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                <Line yAxisId="trm" dataKey="trm" name="TRM promedio" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={(() => {
              const conTrm = serieMensualCosto.filter(m => m.trm != null)
              if (conTrm.length < 2) return null
              const primera = conTrm[0], ultima = conTrm[conTrm.length - 1]
              const varTrm = ((ultima.trm - primera.trm) / primera.trm) * 100
              const pico = serieMensualCosto.reduce((a, b) => (b.costo > a.costo ? b : a))
              return `El mes de mayor inversión fue **${pico.label}** (${formatCurrency(pico.costo)}). La TRM promedio pasó de $${primera.trm.toLocaleString('es-CO')} a $${ultima.trm.toLocaleString('es-CO')} (${varTrm >= 0 ? '+' : ''}${varTrm.toFixed(1)}%) — ${varTrm > 5 ? 'cada crédito cuesta más pesos que antes: si el precio de venta no sube en la misma proporción, el margen se comprime.' : varTrm < -5 ? 'el dólar ha bajado y cada crédito cuesta menos pesos — un viento a favor del margen.' : 'la estabilidad cambiaria mantiene el costo unitario predecible.'}`
            })()} />
          </CardBody>
        </Card>
      )}

      {/* ─── Proyección de Recargas · 12 meses ──────────────────────────────── */}
      {proyeccion.some(m => m.cuentas > 0) && (() => {
        const totalCuentas  = proyeccion.reduce((s, m) => s + m.cuentas,  0)
        const totalCreditos = proyeccion.reduce((s, m) => s + m.creditos, 0)
        const totalPacks    = proyeccion.reduce((s, m) => s + m.packs100, 0)
        const totalCOP      = proyeccion.reduce((s, m) => s + m.costoCOP, 0)
        const saldoFinal    = proyeccion[proyeccion.length - 1]?.saldoDespues ?? SALDO_INICIAL
        const fmtC    = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
        const hayCost = precioPack100 > 0
        return (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl p-2.5 shadow-md">
                <CalendarClock size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-brand-accent">Proyección de Recargas · 12 meses</h2>
                <p className="text-sm text-gray-500">
                  Saldo actual: <strong className="text-indigo-600">{SALDO_INICIAL} Cr disponibles</strong> · 6 créditos por cuenta · Packs de 100 Cr · Saldo arrastra entre meses
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <BiCardCP icon={CalendarClock} variant="solid"   label="CPs a renovar (12m)" value={totalCuentas}
                sub="cuentas padre con vencimiento en el período"
                tag={{ tone: totalCuentas > 20 ? 'warn' : 'info', text: `${totalCuentas} renovaciones proyectadas` }} />
              <BiCardCP icon={Zap}           variant="light"   label="Créditos necesarios" value={totalCreditos}
                sub={`${totalCuentas} cuentas × 6 Cr · Saldo inicial: ${SALDO_INICIAL} Cr`}
                tag={{ tone: 'info', text: '6 créditos = 6 meses por cuenta' }} />
              <BiCardCP icon={Package}       variant="outline" label="Packs de 100 Cr"      value={totalPacks}
                sub={`Con saldo acumulado · Saldo final: ${saldoFinal} Cr sobrantes`}
                tag={{ tone: totalPacks > 5 ? 'warn' : 'good', text: `${totalPacks} compras en el período` }} />
              <BiCardCP icon={DollarSign}    variant={hayCost ? 'solid' : 'outline'} label="Costo estimado (12m)"
                value={hayCost ? fmtC(totalCOP) : '—'}
                sub={hayCost ? `Ref.: ${fmtC(Math.round(precioPack100))} por pack de 100 Cr` : 'Sin datos de costo pantalla'}
                tag={hayCost
                  ? { tone: 'warn', text: `Promedio histórico: ${fmtC(Math.round(precioPack100 / 100))}/Cr` }
                  : { tone: 'info', text: 'Registra recargas para estimar' }} />
            </div>

            <Card className="border-indigo-100 mb-4">
              <CardHeader className="border-indigo-50">
                <CardTitle>Recargas proyectadas mes a mes</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">
                  <span className="inline-flex items-center gap-1 mr-2">
                    <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500" /> Cubierto con saldo
                  </span>
                  <span className="inline-flex items-center gap-1 mr-2">
                    <span className="inline-block w-3 h-3 rounded-sm bg-orange-500" /> Requiere compra
                  </span>
                  <span className="inline-flex items-center gap-1 mr-2">
                    <span className="inline-block w-4 border-t-2 border-red-500 border-dashed" /> Packs 100 Cr
                  </span>
                  · Línea verde = saldo de créditos disponible
                </p>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart data={proyeccion} margin={{ top: 20, right: hayCost ? 64 : 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#c7d2fe" opacity={0.35} />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis yAxisId="left" orientation="left"
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      label={{ value: 'CPs / Saldo Cr', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#9ca3af' }, dy: 55 }}
                      width={44}
                    />
                    {hayCost && (
                      <YAxis yAxisId="right" orientation="right"
                        tick={{ fontSize: 10, fill: '#dc2626' }}
                        tickFormatter={v => v > 0 ? `${(v / 1000).toFixed(0)}k` : '0'}
                        label={{ value: 'COP (miles)', angle: 90, position: 'insideRight', style: { fontSize: 9, fill: '#dc2626' }, dy: -45 }}
                        width={48}
                      />
                    )}
                    <Tooltip content={<ProyeccionTooltip hayCost={hayCost} fmtC={fmtC} />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" />
                    <ReferenceLine yAxisId="left" y={SALDO_INICIAL}
                      stroke="#10b981" strokeDasharray="5 3" strokeWidth={1.5}
                      label={{ value: `Saldo inicial ${SALDO_INICIAL} Cr`, position: 'insideTopRight', fontSize: 9, fill: '#059669', dy: -4 }}
                    />
                    <Bar yAxisId="left" dataKey="cuentas" name="CPs que vencen" radius={[5, 5, 0, 0]} maxBarSize={44}>
                      {proyeccion.map((m, i) => (
                        <Cell key={i} fill={m.cuentas === 0 ? '#e0e7ff' : m.packs100 > 0 ? '#f97316' : '#6366f1'} />
                      ))}
                      <LabelList dataKey="labelCuentas" position="top"
                        style={{ fontSize: 10, fill: '#1e293b', fontWeight: 700, stroke: '#fff', strokeWidth: 3, strokeLinejoin: 'round', paintOrder: 'stroke' }} />
                    </Bar>
                    <Bar yAxisId="left" dataKey="packs100" name="Packs 100 Cr" fill="#ef4444" radius={[5, 5, 0, 0]} maxBarSize={44} opacity={0.85}>
                      <LabelList dataKey="labelPacks" position="top"
                        style={{ fontSize: 10, fill: '#7f1d1d', fontWeight: 700, stroke: '#fff', strokeWidth: 3, strokeLinejoin: 'round', paintOrder: 'stroke' }} />
                    </Bar>
                    <Line yAxisId="left" type="monotone" dataKey="saldoDespues" name="Saldo Cr"
                      stroke="#10b981" strokeWidth={2.5}
                      dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7, stroke: '#059669', strokeWidth: 2 }} />
                    {hayCost && (
                      <Line yAxisId="right" type="monotone" dataKey="costoCOP" name="Costo COP"
                        stroke="#dc2626" strokeWidth={2} strokeDasharray="5 3"
                        dot={{ r: 3, fill: '#dc2626', strokeWidth: 0 }} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
                <ChartInsightCP text={narrarProyeccion(proyeccion, precioPack100)} />
              </CardBody>
            </Card>

            <Card className="border-indigo-100 overflow-hidden mb-6">
              <CardHeader className="border-indigo-50">
                <CardTitle>Detalle mensual de recargas</CardTitle>
                <div className="flex items-center flex-wrap gap-2 mt-1">
                  <p className="text-xs text-gray-400">Saldo inicial: <strong className="text-indigo-600">{SALDO_INICIAL} Cr</strong> · Los créditos no usados pasan al siguiente mes</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">Verde = cubierto con saldo</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700">Naranja = requiere compra de pack</span>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 bg-indigo-50">
                      {['Mes','CPs que vencen','% del período','Créditos (×6)','Packs de 100 Cr','Saldo Cr'].concat(hayCost ? ['Costo estimado COP'] : []).map((h, i) => (
                        <th key={h} className={`sticky top-0 bg-indigo-50 px-4 py-2.5 font-semibold border-b border-indigo-100 ${i > 0 ? 'text-center' : ''} ${i === 6 ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {proyeccion.map((m, i) => (
                      <tr key={m.key}
                        className={`border-b border-gray-50 transition-colors ${
                          m.cuentas === 0  ? 'opacity-40' :
                          m.packs100 > 0   ? 'bg-orange-50 hover:bg-orange-100' :
                          m.creditos > 0   ? 'bg-emerald-50 hover:bg-emerald-100' :
                          'hover:bg-indigo-50'
                        }`}
                      >
                        <td className="px-4 py-2.5 font-semibold text-brand-accent whitespace-nowrap">
                          {i === 0 && <span className="mr-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">HOY</span>}
                          {m.mesLabel}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold">
                          {m.cuentas > 0
                            ? <button
                                onClick={() => setCpMesModal({ label: m.mesLabel, cps: m.cpsList, packsReales: m.packs100, saldoAntes: m.saldoAntes, saldoDespues: m.saldoDespues })}
                                title={`Ver detalle · ${m.cuentas} CP${m.cuentas !== 1 ? 's' : ''} en ${m.mesLabel}`}
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all hover:scale-110 hover:shadow-md cursor-pointer ${m.cuentas >= 10 ? 'bg-red-100 text-red-700 hover:bg-red-200' : m.cuentas >= 5 ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                              >{m.cuentas}</button>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {m.pct > 0
                            ? <div className="flex items-center justify-center gap-1.5">
                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${m.pct}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-indigo-700">{m.pct}%</span>
                              </div>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center text-gray-600">
                          {m.creditos > 0 ? m.creditos : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {m.packs100 > 0
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold"><Package size={10} />{m.packs100}</span>
                            : <span className="text-xs text-emerald-600 font-semibold">Cubierto</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs font-bold ${m.saldoDespues === 0 ? 'text-red-600' : m.saldoDespues < 12 ? 'text-amber-600' : 'text-indigo-600'}`}>
                            {m.saldoDespues} Cr
                          </span>
                        </td>
                        {hayCost && (
                          <td className="px-4 py-2.5 text-right font-semibold">
                            {m.costoCOP > 0 ? <span className="text-emerald-700">{fmtC(m.costoCOP)}</span> : <span className="text-gray-300">—</span>}
                          </td>
                        )}
                      </tr>
                    ))}
                    <tr className="bg-indigo-50 border-t-2 border-indigo-200 font-bold">
                      <td className="px-4 py-3 text-indigo-800">Total 12 meses</td>
                      <td className="px-4 py-3 text-center text-indigo-800">{totalCuentas}</td>
                      <td className="px-4 py-3 text-center text-indigo-500 text-sm">100%</td>
                      <td className="px-4 py-3 text-center text-indigo-800">{totalCreditos}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500 text-white text-xs font-bold"><Package size={11} />{totalPacks}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold ${saldoFinal < 12 ? 'text-amber-600' : 'text-indigo-600'}`}>{saldoFinal} Cr</span>
                      </td>
                      {hayCost && <td className="px-4 py-3 text-right text-emerald-700">{fmtC(totalCOP)}</td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )
      })()}

      {/* Form Drawer (PRO MAX Drawer) */}
      {showForm && (
        <>
          <div className="cp-overlay fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={closeForm} />
          <div className="cp-drawer fixed inset-y-0 right-0 z-50 w-full md:w-[600px] bg-white shadow-2xl flex flex-col border-l border-slate-100">
            {/* Header del Drawer */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{editing ? 'Editar Registro' : 'Nueva Recarga'}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {editing ? `Editando ${editing.idRec}` : 'Complete todos los campos'}
                </p>
              </div>
              <button onClick={closeForm} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo del Formulario */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {/* Sección: Identificación */}
                <section>
                  <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-2 border-b border-orange-100 pb-1 mb-4">
                    📋 Identificación
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID Registro</label>
                      <input value={form.idRec} onChange={f('idRec')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm font-mono transition-all" placeholder="R39" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Acción</label>
                      <select value={form.accion} onChange={f('accion')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white transition-all">
                        <option>Recarga</option>
                        <option>Compra</option>
                        <option>Ajuste</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Créditos</label>
                      <input type="number" value={form.creditos} onChange={f('creditos')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                      <input type="number" min="1" value={form.itemQuantity} onChange={f('itemQuantity')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                  </div>
                </section>

                {/* Sección: Fechas */}
                <section>
                  <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-2 border-b border-orange-100 pb-1 mb-4">
                    📅 Fecha
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                      <input type="date" value={form.fecha} onChange={f('fecha')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Año (auto)</label>
                      <input value={form.anio} onChange={f('anio')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm cursor-not-allowed" disabled />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mes (auto)</label>
                      <input value={form.mes} onChange={f('mes')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm cursor-not-allowed" disabled />
                    </div>
                  </div>
                </section>

                {/* Sección: Costos */}
                <section>
                  <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-2 border-b border-orange-100 pb-1 mb-4">
                    💰 Costos
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Costo COP</label>
                      <CurrencyInput value={form.costoCOP} onChange={f('costoCOP')} decimals={0}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Impuesto 4x1000 COP (auto)</label>
                      <CurrencyInput value={form.impuesto4x100COP} onChange={f('impuesto4x100COP')} decimals={0}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Costo USD</label>
                      <CurrencyInput value={form.costoUSD} onChange={f('costoUSD')} decimals={2}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">TRM</label>
                      <CurrencyInput value={form.trm} onChange={f('trm')} decimals={2} prefix=""
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cto. Unit. Cuenta USD</label>
                      <CurrencyInput value={form.costoUnitarioCuentaUSD} onChange={f('costoUnitarioCuentaUSD')} decimals={2}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cto. Unit. Cuenta COP</label>
                      <CurrencyInput value={form.costoUnitarioCuentaCOP} onChange={f('costoUnitarioCuentaCOP')} decimals={0}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cto. Pantalla USD</label>
                      <CurrencyInput value={form.costoPantallaUSD} onChange={f('costoPantallaUSD')} decimals={2}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cto. Pantalla COP</label>
                      <CurrencyInput value={form.costoPantallaCOP} onChange={f('costoPantallaCOP')} decimals={0}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Medio de Pago</label>
                      <select value={form.medioPago} onChange={f('medioPago')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white transition-all">
                        <option>Nequi</option>
                        <option>Bancolombia</option>
                        <option>Daviplata</option>
                        <option>Efectivo</option>
                        <option>Otro</option>
                      </select>
                    </div>
                  </div>
                </section>

              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="cp-cta px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md hover:shadow-lg"
                >
                  {editing ? 'Guardar cambios' : 'Crear registro'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
