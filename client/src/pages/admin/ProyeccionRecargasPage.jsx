import { useState, useMemo, useEffect } from 'react'
import {
  CalendarClock, Zap, Package, DollarSign, X, Sparkles, Lightbulb, Pencil, TrendingUp,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LabelList, Cell, ReferenceLine,
} from 'recharts'
import api from '../../config/api'
import { useApiResource } from '../../hooks/useApiResource'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { formatDate, formatCurrency } from '../../utils/excelUtils'

const MES_ORDEN = {
  ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
  JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
}
const MES_ABREV = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const SALDO_INICIAL_DEFAULT = 27
const DIAS_ALERTA_CP = 30

const CSS = `
  @keyframes pr-fade-up { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes pr-orb-1   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes pr-orb-2   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  .pr-a1 { animation: pr-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .pr-a2 { animation: pr-fade-up .45s .08s cubic-bezier(.22,1,.36,1) both }
  .pr-a3 { animation: pr-fade-up .45s .16s cubic-bezier(.22,1,.36,1) both }
  .pr-orb-1 { animation: pr-orb-1 8s ease-in-out infinite }
  .pr-orb-2 { animation: pr-orb-2 11s ease-in-out infinite }
  .pr-overlay { animation: pr-fade-up .2s ease both }
`

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

function narrarProyeccion(proyeccion, precioPack100, saldoInicial) {
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
    ? ` Los **${saldoInicial} Cr actuales cubren los primeros ${mesesCubiertos} mes${mesesCubiertos !== 1 ? 'es' : ''} sin compras adicionales${primerCompra ? ` — primera recarga en **${primerCompra.mesLabel}**` : ''}.`
    : ` El saldo actual (${saldoInicial} Cr) no alcanza para el primer mes — se necesita compra inmediata.`
  return `En los próximos **12 meses**, **${total} cuenta${total !== 1 ? 's' : ''} padre** requerirán recarga (${totalCreditos} créditos).${coberturaTxt} Solo hacen falta **${totalPacks} pack${totalPacks !== 1 ? 's' : ''} de 100 Cr en ${mesesConCompra} mes${mesesConCompra !== 1 ? 'es' : ''}** gracias al arrastre del saldo. Mes pico: **${mesPico.mesLabel}** con **${mesPico.cuentas} cuenta${mesPico.cuentas !== 1 ? 's' : ''}** por vencer.${hayPrecio ? ` Costo estimado: **${fmtC(totalCOP)}** (ref.: ${fmtC(Math.round(precioPack100))} por pack de 100 Cr).` : ' Carga datos de costo para ver la proyección en COP.'}`
}

export default function ProyeccionRecargasPage() {
  const { data: rows, loading } = useApiResource('/admin/payments/costo-pantalla')
  const [cpRows, setCpRows] = useState([])
  const [cpMesModal, setCpMesModal] = useState(null)
  const [saldoInicial, setSaldoInicial] = useState(SALDO_INICIAL_DEFAULT)

  useEffect(() => {
    api.get('/admin/cuentas-padre')
      .then(r => setCpRows(r.data || []))
      .catch(() => {})
  }, [])

  // ── Evolución mensual del costo (con 4x1000) y TRM ──────────────────────
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

  // ── Proyección de recargas · 12 meses (usa el saldo interactivo) ────────
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

    let saldo = saldoInicial
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
  }, [rows, cpRows, saldoInicial])

  const fmtC = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
  const totalCuentas  = proyeccion.reduce((s, m) => s + m.cuentas,  0)
  const totalCreditos = proyeccion.reduce((s, m) => s + m.creditos, 0)
  const totalPacks    = proyeccion.reduce((s, m) => s + m.packs100, 0)
  const totalCOP      = proyeccion.reduce((s, m) => s + m.costoCOP, 0)
  const saldoFinal    = proyeccion[proyeccion.length - 1]?.saldoDespues ?? saldoInicial
  const hayCost = precioPack100 > 0
  const haySaldo = proyeccion.some(m => m.cuentas > 0)

  return (
    <div>
      <style>{CSS}</style>

      {/* ── HERO HEADER ── */}
      <div className="pr-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#312e81 0%,#1e1b4b 100%)' }}>
        <div className="pr-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)' }} />
        <div className="pr-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.15] pointer-events-none" style={{ background: 'radial-gradient(circle,#818cf8,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative px-7 py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/25 mb-4">
            <TrendingUp size={12} className="text-indigo-300" />
            <span className="text-indigo-300 text-xs font-semibold tracking-widest uppercase">Planificación</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
            Proyección de Recargas
          </h1>
          <p className="text-indigo-100/70 text-sm mt-2 max-w-2xl">
            Cuándo se van a necesitar créditos (Cr) en los próximos 12 meses, cuántos packs comprar y qué va a costar — para planear la compra con anticipación.
          </p>
        </div>
      </div>

      <CpMesDetalleModal data={cpMesModal} onClose={() => setCpMesModal(null)} />

      {/* ── Evolución mensual del costo (con 4x1000) y TRM ── */}
      {serieMensualCosto.length >= 2 && (
        <Card className="border-orange-100 mb-6 pr-a2">
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
            <ChartInsightCP text={(() => {
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

      {/* ── Proyección de Recargas · 12 meses (+ saldo interactivo) ── */}
      {!loading && haySaldo && (
        <div className="mb-6 pr-a3">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl p-2.5 shadow-md">
                <CalendarClock size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-brand-accent">Proyección de Recargas · 12 meses</h2>
                <p className="text-sm text-gray-500">6 créditos por cuenta · Packs de 100 Cr · Saldo arrastra entre meses</p>
              </div>
            </div>

            {/* Campo interactivo: saldo actual de créditos — alimenta toda la proyección de abajo */}
            <label className="flex items-center gap-2.5 bg-white border-2 border-indigo-200 rounded-2xl pl-4 pr-2 py-2 shadow-sm">
              <Pencil size={14} className="text-indigo-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-500 whitespace-nowrap">Saldo actual de créditos</span>
              <input
                type="number" min="0" value={saldoInicial}
                onChange={(e) => setSaldoInicial(Math.max(0, Math.round(Number(e.target.value)) || 0))}
                className="w-20 text-right font-extrabold text-indigo-700 text-lg bg-indigo-50 rounded-xl px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <span className="text-sm font-bold text-indigo-500 pr-1">Cr</span>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <BiCardCP icon={CalendarClock} variant="solid"   label="CPs a renovar (12m)" value={totalCuentas}
              sub="cuentas padre con vencimiento en el período"
              tag={{ tone: totalCuentas > 20 ? 'warn' : 'info', text: `${totalCuentas} renovaciones proyectadas` }} />
            <BiCardCP icon={Zap}           variant="light"   label="Créditos necesarios" value={totalCreditos}
              sub={`${totalCuentas} cuentas × 6 Cr · Saldo inicial: ${saldoInicial} Cr`}
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
                  <ReferenceLine yAxisId="left" y={saldoInicial}
                    stroke="#10b981" strokeDasharray="5 3" strokeWidth={1.5}
                    label={{ value: `Saldo inicial ${saldoInicial} Cr`, position: 'insideTopRight', fontSize: 9, fill: '#059669', dy: -4 }}
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
              <ChartInsightCP text={narrarProyeccion(proyeccion, precioPack100, saldoInicial)} />
            </CardBody>
          </Card>

          {/* ── Detalle mensual de recargas ── */}
          <Card className="border-indigo-100 overflow-hidden mb-6">
            <CardHeader className="border-indigo-50">
              <CardTitle>Detalle mensual de recargas</CardTitle>
              <div className="flex items-center flex-wrap gap-2 mt-1">
                <p className="text-xs text-gray-400">Saldo inicial: <strong className="text-indigo-600">{saldoInicial} Cr</strong> · Los créditos no usados pasan al siguiente mes</p>
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
      )}

      {!loading && !haySaldo && (
        <div className="py-16 text-center text-sm text-gray-400 bg-white rounded-2xl border border-indigo-100">
          Ninguna cuenta padre tiene fecha de vencimiento en los próximos 12 meses.
        </div>
      )}
    </div>
  )
}
