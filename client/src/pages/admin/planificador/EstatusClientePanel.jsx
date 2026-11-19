// Panel "Estatus Cliente" del Planificador: tabla de clientes con datos de
// cuenta opcionales, copiable como imagen y con acceso al comprobante.
import { useEffect, useRef, useState } from 'react'
import {
  Users, X, Copy, Check, Loader2, KeyRound, Eye, EyeOff, Maximize2, Minimize2, Receipt,
} from 'lucide-react'
import * as htmlToImage from 'html-to-image'
import { cn } from '../../../utils/cn'
import { useUi } from '../../../context/UiContext'
import { Badge } from '../../../components/ui/Badge'
import { formatDate, formatCurrency } from '../../../utils/excelUtils'
import { calcDias, getRowVariant, ROW_BG, estadoBadgeVariant } from './rowHelpers'
import { MonthsChip } from './TableBits'

export function EstatusClientePanel({ rows, stats, filterStatus, passwords, revelar, onClose, onComprobante }) {
  const { showToast } = useUi()
  const [showCuentaData, setShowCuentaData] = useState(false)
  const [estatusExpanded, setEstatusExpanded] = useState(false)
  const [showEstatusPwd, setShowEstatusPwd] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiandoImg, setCopiandoImg] = useState(false)
  const estatusTablaRef = useRef(null)

  // Si el Planificador se recarga, la página descarta las contraseñas reveladas
  // (el mapa queda vacío): entonces se vuelven a ocultar aquí también
  const sinClaves = Object.keys(passwords || {}).length === 0
  useEffect(() => { if (sinClaves) setShowEstatusPwd(false) }, [sinClaves])

  // "Mostrar claves": pide las contraseñas de las filas visibles (queda registrado)
  const toggleEstatusPwd = async () => {
    if (showEstatusPwd) { setShowEstatusPwd(false); return }
    if (await revelar(rows.map(r => r.idPantalla), 'estatus')) setShowEstatusPwd(true)
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


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm overflow-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
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
              onClick={toggleEstatusPwd}
              title={showEstatusPwd ? 'Ocultar claves' : 'Mostrar claves — el acceso queda registrado'}
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
            onClick={() => onClose()}
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
              <th data-nocapture className="sticky top-0 right-0 z-20 bg-orange-600 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Comprobante</th>
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
                        ? <span className="font-mono text-gray-700">{passwords[row.idPantalla] ?? '—'}</span>
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
                  <td data-nocapture className="px-3 py-2 whitespace-nowrap border-b border-gray-100 text-center sticky right-0 z-[5] bg-white shadow-[-8px_0_10px_-8px_rgba(15,23,42,0.25)]">
                    <button
                      onClick={() => onComprobante(row)}
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
  )
}
