// "Registrar renovación": un solo paso que crea la venta en Pagos y extiende
// el plan de la pantalla en el Planificador (inicio real, meses, fin real y
// sin deuda). Antes había que registrar la venta en Pagos y luego editar las
// fechas a mano; si se olvidaba lo segundo, el cliente seguía "vencido".
import { useEffect, useMemo, useState } from 'react'
import { X, RefreshCcw, Loader2, ExternalLink, CalendarClock, ArrowRight, ChevronDown, Tv } from 'lucide-react'
import api from '../../../config/api'
import { cn } from '../../../utils/cn'
import { useUi } from '../../../context/UiContext'
import { todayStr } from '../../../utils/dateUtils'
import { formatDate, formatCurrency } from '../../../utils/excelUtils'
import { CurrencyInput } from '../../../components/ui/CurrencyInput'
import { mesesPorPlan, precioPorPlan, sumarMeses, inicioSugerido, diasRestantesDe, datosPagoSugeridos } from './renovacion'
import { TIPOS_FIRE, MESES, tipoFireDeSku } from '../../../config/equipos'
import { diasLabel } from './rowHelpers'

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary'

function Campo({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
    </label>
  )
}

export function RenovarModal({ row, onClose, onRenovado, onAbrirPagos }) {
  const { showToast } = useUi()
  const pantallas = Math.max(1, Math.floor(Number(row.pantallas)) || 1)
  const [opciones, setOpciones] = useState(null)
  const [ultimoPago, setUltimoPago] = useState(null)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    fecha: todayStr(), tipoPlan: '', meses: '', precioVenta: '', medioPago: '', inicioManual: false, inicioReal: '',
    // Datos del pago (como en "Nueva Venta"): se llenan con el último pago
    sku: '', tipoFire: '', estado: 'Activo', cortesia: 'NO', pantallas: 1, itemQuantity: 1,
    tipoPantalla: '', cuentaDedicada: 'NO', mes: MESES[new Date().getMonth()],
  })
  const [verPago, setVerPago] = useState(true)
  const [tipoCliente, setTipoCliente] = useState(null)

  useEffect(() => {
    let vivo = true
    Promise.all([
      api.get('/admin/planificador/renovar/opciones'),
      row.nickname
        ? api.get(`/admin/planificador/comprobante/${encodeURIComponent(row.nickname)}`, {
            params: { idPantalla: row.idPantalla, ...(row.customerId ? { customerId: row.customerId } : {}) },
          })
        : Promise.resolve({ data: {} }),
    ])
      .then(([op, comp]) => {
        if (!vivo) return
        const pago = comp.data?.pago || null
        setOpciones(op.data)
        setUltimoPago(pago)
        setTipoCliente(comp.data?.tipoCliente || null)
        // Sugerencias: el plan y el medio de pago del último pago de esta pantalla
        const tipoPlan = pago?.tipoPlan || op.data.tiposPlan.find(t => /mensual/i.test(t)) || op.data.tiposPlan[0] || ''
        setForm(f => ({
          ...f,
          tipoPlan,
          meses: mesesPorPlan(tipoPlan, op.data.catalogo, pantallas) ?? '',
          precioVenta: precioPorPlan(tipoPlan, op.data.catalogo, pantallas, pago) ?? '',
          medioPago: pago?.medioPago || op.data.mediosPago.find(m => /nequi/i.test(m)) || '',
          ...datosPagoSugeridos(row, pago, comp.data?.tipoCliente),
        }))
      })
      .catch(e => vivo && setError(e.response?.data?.error || 'No se pudieron cargar los planes.'))
    return () => { vivo = false }
  }, [row.idPantalla, row.nickname, row.customerId, pantallas])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !guardando) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, guardando])

  const elegirPlan = (tipoPlan) => setForm(f => ({
    ...f,
    tipoPlan,
    meses: mesesPorPlan(tipoPlan, opciones?.catalogo, pantallas) ?? f.meses,
    precioVenta: precioPorPlan(tipoPlan, opciones?.catalogo, pantallas, ultimoPago) ?? f.precioVenta,
  }))

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))
  // Al cambiar el SKU se propone el equipo correspondiente (igual que en Pagos)
  const elegirSku = (sku) => setForm(f => ({ ...f, sku, tipoFire: tipoFireDeSku(sku, opciones?.tipoFirePorSku) || f.tipoFire }))
  // Al cambiar la fecha del pago, el mes facturado la sigue (se puede cambiar)
  const elegirFecha = (fecha) => setForm(f => ({ ...f, fecha, mes: MESES[Number(String(fecha).slice(5, 7)) - 1] || f.mes }))
  const opcionesCon = (lista = [], actual) => (actual && !lista.includes(actual) ? [actual, ...lista] : lista)

  const finActual = row.duracionReal || row.finalizacion
  const dias = diasRestantesDe(row)
  const inicio = form.inicioManual && form.inicioReal ? form.inicioReal : inicioSugerido(finActual, form.fecha)
  const finNuevo = form.meses ? sumarMeses(inicio, form.meses) : ''
  const valido = form.tipoPlan && Number(form.meses) >= 1 && form.precioVenta !== '' && Number(form.precioVenta) >= 0 && form.fecha

  const guardar = async () => {
    if (!valido || guardando) return
    setGuardando(true); setError(null)
    try {
      const r = await api.post(`/admin/planificador/${encodeURIComponent(row.idPantalla)}/renovar`, {
        fecha: form.fecha,
        tipoPlan: form.tipoPlan,
        meses: Number(form.meses),
        precioVenta: Number(form.precioVenta),
        medioPago: form.medioPago || null,
        ...(form.inicioManual && form.inicioReal ? { inicioReal: form.inicioReal } : {}),
        sku: form.sku || null,
        tipoFire: form.tipoFire || null,
        estado: form.estado || null,
        cortesia: form.cortesia || null,
        pantallas: Number(form.pantallas) || null,
        itemQuantity: Number(form.itemQuantity) || 1,
        tipoPantalla: form.tipoPantalla || null,
        cuentaDedicada: form.cuentaDedicada || null,
        mes: form.mes || null,
      })
      showToast(`Renovación registrada: venta ${r.data.venta.idVM} · ${row.nickname} vigente hasta ${formatDate(r.data.duracionReal)}.`, 'success')
      onRenovado?.(r.data)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setGuardando(false)
    }
  }

  const cliente = [row.nombre, row.apellido].filter(Boolean).join(' ') || row.nickname

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-auto"
      onClick={e => { if (e.target === e.currentTarget && !guardando) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] my-auto" role="dialog" aria-label="Registrar renovación">
        <div className="rounded-t-2xl px-5 py-4 flex items-center justify-between text-white" style={{ background: 'linear-gradient(90deg,#16a34a,#22c55e)' }}>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2"><RefreshCcw size={20} /></div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Registrar renovación</h2>
              <p className="text-white/85 text-xs">{cliente} · {row.nickname} · {row.idPantalla}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={guardando} className="hover:bg-white/20 rounded-lg p-2" aria-label="Cerrar"><X size={18} /></button>
        </div>

        {!opciones && !error ? (
          <div className="px-5 py-12 text-center text-gray-400"><Loader2 className="mx-auto animate-spin" /> <p className="text-sm mt-2">Cargando planes…</p></div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Fin actual: {finActual ? formatDate(finActual) : '—'}</span>
              <span className="font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{diasLabel(dias)}</span>
              {row.debe && <span className="font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Debe: se marcará al día</span>}
              {ultimoPago?.fecha && <span className="font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Último pago {formatDate(ultimoPago.fecha)} · {formatCurrency(ultimoPago.precioVenta)}</span>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Campo label="Plan">
                <select className={inputCls} value={form.tipoPlan} onChange={e => elegirPlan(e.target.value)}>
                  {(opciones?.tiposPlan || []).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Campo>
              <Campo label="Meses que suma" hint={mesesPorPlan(form.tipoPlan, opciones?.catalogo, pantallas) == null ? 'Promoción: escribe los meses' : undefined}>
                <input className={inputCls} type="number" min="1" max="36" step="1" value={form.meses}
                  onChange={e => setForm(f => ({ ...f, meses: e.target.value }))} />
              </Campo>
              <Campo label="Precio">
                <CurrencyInput value={form.precioVenta} onChange={e => setForm(f => ({ ...f, precioVenta: e.target.value }))} />
              </Campo>
              <Campo label="Medio de pago">
                <select className={inputCls} value={form.medioPago} onChange={e => setForm(f => ({ ...f, medioPago: e.target.value }))}>
                  <option value="">—</option>
                  {(opciones?.mediosPago || []).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Campo>
              <Campo label="Fecha del pago">
                <input className={inputCls} type="date" value={form.fecha} onChange={e => elegirFecha(e.target.value)} />
              </Campo>
              <Campo label="Inicio del nuevo período" hint={form.inicioManual ? undefined : (dias != null && dias > 0 ? 'Sigue al plan actual: no pierde días' : 'Ya venció: arranca el día del pago')}>
                {form.inicioManual
                  ? <input className={inputCls} type="date" value={form.inicioReal || inicio} onChange={e => setForm(f => ({ ...f, inicioReal: e.target.value }))} />
                  : <button type="button" onClick={() => setForm(f => ({ ...f, inicioManual: true, inicioReal: inicio }))}
                      className={cn(inputCls, 'text-left bg-gray-50 hover:bg-gray-100')} title="Cambiar el inicio">
                      {formatDate(inicio)} <span className="text-[11px] text-brand-primary ml-1">cambiar</span>
                    </button>}
              </Campo>
            </div>

            {/* Datos del pago (como en "Nueva Venta"), llenados con el último pago */}
            <div className="rounded-xl border border-gray-200">
              <button type="button" onClick={() => setVerPago(v => !v)} aria-expanded={verPago}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-600">
                <span className="flex items-center gap-1.5"><Tv size={13} /> Datos del pago</span>
                <span className="flex items-center gap-2 font-normal text-gray-400">
                  {ultimoPago ? `Del último pago${ultimoPago.idVM ? ` (${ultimoPago.idVM})` : ''}` : 'Sin pagos previos: complétalos'}
                  <ChevronDown size={14} className={cn('transition-transform', verPago && 'rotate-180')} />
                </span>
              </button>
              {verPago && (
                <div className="grid grid-cols-2 gap-3 px-3 pb-3">
                  <Campo label="SKU">
                    <select className={cn(inputCls, 'font-mono')} value={form.sku} onChange={e => elegirSku(e.target.value)}>
                      <option value="">Seleccionar dispositivo…</option>
                      {opcionesCon(opciones?.skus, form.sku).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Tipo Fire">
                    <select className={inputCls} value={form.tipoFire} onChange={set('tipoFire')}>
                      <option value="">Seleccionar equipo…</option>
                      {opcionesCon([...new Set([...(opciones?.tiposFire || []), ...TIPOS_FIRE])], form.tipoFire).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Estado">
                    <select className={inputCls} value={form.estado} onChange={set('estado')}>
                      {['Activo', 'Desactivado', 'Baja'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Cortesía">
                    <select className={inputCls} value={form.cortesia} onChange={set('cortesia')}>
                      {['NO', 'SI'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Pantallas">
                    <input className={inputCls} type="number" min="1" step="1" value={form.pantallas} onChange={set('pantallas')} />
                  </Campo>
                  <Campo label="Cantidad">
                    <input className={inputCls} type="number" min="1" step="1" value={form.itemQuantity} onChange={set('itemQuantity')} />
                  </Campo>
                  <Campo label="Tipo Pantalla" hint={tipoCliente ? `Tipo Cliente en Tabla Clientes: ${tipoCliente}` : undefined}>
                    <select className={inputCls} value={form.tipoPantalla} onChange={set('tipoPantalla')}>
                      <option value="">—</option>
                      {opcionesCon(opciones?.tiposPantalla, form.tipoPantalla).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Cuenta Dedicada">
                    <select className={inputCls} value={form.cuentaDedicada} onChange={set('cuentaDedicada')}>
                      {['NO', 'SI'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Mes facturado">
                    <select className={inputCls} value={form.mes} onChange={set('mes')}>
                      {MESES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Tipo de pago">
                    <input className={cn(inputCls, 'bg-gray-50 text-gray-500')} value="Renovacion" readOnly />
                  </Campo>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 flex items-center gap-2 text-sm">
              <CalendarClock size={16} className="text-emerald-600 shrink-0" />
              <span className="text-slate-600">Fin del plan:</span>
              <span className="font-semibold text-slate-500">{finActual ? formatDate(finActual) : '—'}</span>
              <ArrowRight size={14} className="text-emerald-600" />
              <span className="font-bold text-emerald-700">{finNuevo ? formatDate(finNuevo) : '—'}</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Se crea la venta en Pagos (Renovación) y se actualiza esta pantalla en el Planificador. Si te equivocas, lo deshaces desde el Historial (también borra la venta).
            </p>

            {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex items-center justify-between gap-2 pt-1">
              {onAbrirPagos
                ? <button type="button" onClick={onAbrirPagos} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand-primary">
                    <ExternalLink size={12} /> Abrir en Pagos
                  </button>
                : <span />}
              <div className="flex gap-2">
                <button onClick={onClose} disabled={guardando} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">Cancelar</button>
                <button onClick={guardar} disabled={!valido || guardando}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-50 shadow-sm"
                  style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                  {guardando ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />} Renovar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
