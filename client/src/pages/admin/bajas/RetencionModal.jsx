// Oferta de regreso para un cliente dado de baja: se ajusta el descuento, el
// plan destacado y la vigencia, se ve cómo queda y se envía por WhatsApp
// (WhatsApp Web en computador) con el mensaje ya escrito.
import { useEffect, useMemo, useState } from 'react'
import { X, MessageCircle, Copy, Check, Gift, Star, ChevronDown, AlertTriangle, Sparkles } from 'lucide-react'
import { cn } from '../../../utils/cn'
import { useUi } from '../../../context/UiContext'
import { useEsMovil } from '../../../hooks/useEsMovil'
import { CurrencyInput } from '../../../components/ui/CurrencyInput'
import { normalizarTelefono } from '../../../utils/telefono'
import { formatDate } from '../../../utils/excelUtils'
import { construirOferta, preciosBase, estrategiaDe, urlWhatsApp, MODALIDADES } from './ofertaRetencion'
import { COLORES_MOTIVO } from './lecturas'

const pesos = (v) => `$${Math.round(Number(v) || 0).toLocaleString('es-CO')}`
const DESCUENTOS = [0, 10, 15, 20, 25, 30]
const VIGENCIAS = [3, 7, 15]

function Segmentos({ opciones, valor, onCambio, etiqueta, formato = (v) => v }) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
      {opciones.map(v => (
        <button key={v} type="button" role="radio" aria-checked={valor === v} onClick={() => onCambio(v)}
          className={cn('flex-1 min-w-0 px-1 py-1.5 rounded-md text-xs font-semibold transition-colors',
            valor === v ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
          {formato(v)}
        </button>
      ))}
    </div>
  )
}

// Convierte el formato de WhatsApp (*negrita*, ~tachado~) en la vista previa
function TextoWhatsApp({ texto }) {
  const partes = texto.split(/(\*[^*\n]+\*|~[^~\n]+~)/g)
  return partes.map((p, i) => {
    if (/^\*[^*]+\*$/.test(p)) return <strong key={i}>{p.slice(1, -1)}</strong>
    if (/^~[^~]+~$/.test(p)) return <s key={i} className="text-slate-500">{p.slice(1, -1)}</s>
    return <span key={i}>{p}</span>
  })
}

export function RetencionModal({ candidato, planes, onClose, onEnviada }) {
  const { showToast } = useUi()
  const movil = useEsMovil()
  const est = estrategiaDe(candidato.categoria)
  const { base: baseCatalogo, modUltima } = useMemo(() => preciosBase(candidato, planes), [candidato, planes])

  const [descuento, setDescuento] = useState(est.descuento)
  const [vigencia, setVigencia] = useState(7)
  const [recomendado, setRecomendado] = useState(est.recomendado || modUltima || 'mensual')
  const [base, setBase] = useState(baseCatalogo)
  const [verPrecios, setVerPrecios] = useState(false)
  const [telefono, setTelefono] = useState(candidato.telefono || '')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const oferta = useMemo(
    () => construirOferta(candidato, planes, { descuento, vigenciaDias: vigencia, recomendado, base }),
    [candidato, planes, descuento, vigencia, recomendado, base],
  )
  const tel = useMemo(() => normalizarTelefono(telefono, candidato.pais), [telefono, candidato.pais])
  const disponibles = MODALIDADES.filter(m => Number(base[m.clave]) > 0).map(m => m.clave)
  const faltan = MODALIDADES.filter(m => !(Number(base[m.clave]) > 0))

  const enviar = () => {
    if (!oferta.opciones.length) return
    window.open(urlWhatsApp(tel.numero, oferta.mensaje, { movil }), '_blank', 'noopener')
    onEnviada?.(candidato)
  }
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(oferta.mensaje)
      setCopiado(true); setTimeout(() => setCopiado(false), 1800)
    } catch { showToast('No se pudo copiar el mensaje.', 'error') }
  }

  const nombre = candidato.nombre || candidato.nickname

  return (
    <div className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-auto" role="dialog" aria-modal="true" aria-label={`Oferta de regreso para ${nombre}`}>
        <div className="rounded-t-2xl px-5 py-4 flex items-center justify-between text-white bg-gradient-to-r from-emerald-700 to-teal-600">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white/20 rounded-lg p-2"><Gift size={20} /></div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight truncate">Oferta de regreso · {nombre}</h2>
              <p className="text-white/85 text-xs truncate">
                Se fue el {formatDate(candidato.fechaBaja)} · {candidato.categoriaNombre}
                {candidato.ultimaVenta ? ` · último plan ${candidato.ultimaVenta.tipoPlan || ''} ${pesos(candidato.ultimaVenta.precioVenta)}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-lg hover:bg-white/15 text-white/80 hover:text-white"><X size={18} /></button>
        </div>

        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-5 p-4 sm:p-5">
          {/* Ajustes + tarjeta de la oferta */}
          <div className="space-y-4 min-w-0">
            <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-100 px-3.5 py-2.5 text-sm text-emerald-900 flex gap-2">
              <Sparkles size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <p><strong>Estrategia por el motivo ({candidato.categoriaNombre.toLowerCase()}):</strong> {est.descuento ? `${est.descuento}% de descuento` : 'sin descuento'}{est.recomendado ? ` y destacar el plan ${est.recomendado}` : ''}. {est.gancho}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-xs font-semibold text-slate-600 mb-1">Descuento de regreso</span>
                <Segmentos etiqueta="Descuento" opciones={DESCUENTOS} valor={descuento} onCambio={setDescuento} formato={(v) => (v ? `${v}%` : 'No')} />
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-600 mb-1">Oferta válida por</span>
                <Segmentos etiqueta="Vigencia" opciones={VIGENCIAS} valor={vigencia} onCambio={setVigencia} formato={(v) => `${v} días`} />
              </div>
              {disponibles.length > 1 && (
                <div className="sm:col-span-2">
                  <span className="block text-xs font-semibold text-slate-600 mb-1">Plan que se recomienda</span>
                  <Segmentos etiqueta="Plan recomendado" opciones={disponibles} valor={recomendado} onCambio={setRecomendado}
                    formato={(v) => MODALIDADES.find(m => m.clave === v).nombre} />
                </div>
              )}
            </div>

            {/* Tarjetas de precio */}
            <div className={cn('grid gap-2.5', oferta.opciones.length === 3 ? 'sm:grid-cols-3' : oferta.opciones.length === 2 ? 'sm:grid-cols-2' : '')}>
              {oferta.opciones.map(o => (
                <div key={o.clave} className={cn('relative rounded-2xl p-3.5 ring-1',
                  o.recomendado ? 'ring-2 ring-emerald-500 bg-emerald-50/60' : 'ring-slate-200 bg-white')}>
                  {o.recomendado && (
                    <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5">
                      <Star size={10} fill="currentColor" /> Recomendado
                    </span>
                  )}
                  <p className="text-sm font-bold text-slate-800">{o.nombre}</p>
                  <p className="text-[11px] text-slate-500">{o.regalo ? `${o.pagas} meses + ${o.regalo} de regalo` : '1 mes'} · {oferta.pantallas} pant.</p>
                  {o.ahorroDescuento > 0 && <p className="text-xs text-slate-400 line-through mt-2">{pesos(o.precioBase)}</p>}
                  <p className={cn('dash-num text-[26px] font-bold leading-none text-slate-900', o.ahorroDescuento > 0 ? 'mt-0.5' : 'mt-2')}>{pesos(o.precio)}</p>
                  {o.meses > 1 && <p className="text-xs font-semibold text-emerald-700 mt-1">{pesos(o.porMes)} al mes</p>}
                  {o.ahorroVsMensual > 0 && <p className="text-[11px] text-slate-500 mt-0.5">Ahorra {pesos(o.ahorroVsMensual)} vs. mes a mes</p>}
                  {o.respetado && <p className="text-[11px] text-amber-700 mt-0.5">Su precio de siempre</p>}
                </div>
              ))}
            </div>
            {!oferta.opciones.length && (
              <p className="text-sm text-amber-700 flex items-center gap-1.5"><AlertTriangle size={14} /> No hay precios en el catálogo para {oferta.pantallas} pantallas: escríbelos en "Ajustar precios base".</p>
            )}

            <div className="rounded-xl ring-1 ring-slate-200">
              <button type="button" onClick={() => setVerPrecios(v => !v)} aria-expanded={verPrecios}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold text-slate-700">
                <span>Ajustar precios base <span className="font-normal text-slate-400">· antes del descuento{faltan.length ? ` · faltan ${faltan.map(m => m.nombre.toLowerCase()).join(' y ')}` : ''}</span></span>
                <ChevronDown size={16} className={cn('transition-transform', verPrecios && 'rotate-180')} />
              </button>
              {verPrecios && (
                <div className="grid grid-cols-3 gap-2 px-3.5 pb-3.5">
                  {MODALIDADES.map(m => (
                    <CurrencyInput key={m.clave} label={m.nombre} value={base[m.clave] ?? ''}
                      onChange={(e) => setBase(b => ({ ...b, [m.clave]: e.target.value === '' ? null : Number(e.target.value) }))} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mensaje + envío */}
          <div className="space-y-3 min-w-0">
            <label className="block">
              <span className="block text-xs font-semibold text-slate-600 mb-1">WhatsApp del cliente</span>
              <input value={telefono} onChange={e => setTelefono(e.target.value)} inputMode="tel" placeholder="Ej. 300 123 4567"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              <span className={cn('block text-[11px] mt-1', tel.numero && tel.conIndicativo ? 'text-slate-400' : 'text-amber-700')}>
                {!telefono ? 'Sin teléfono registrado: escríbelo o elige el contacto en WhatsApp.' : tel.conIndicativo ? `Se enviará a +${tel.numero}` : 'Revisa el número: no tiene indicativo de país.'}
              </span>
            </label>

            <div className="rounded-2xl p-3 bg-[#e5ddd5]">
              <div className="ml-auto max-w-[95%] rounded-xl rounded-tr-sm bg-[#dcf8c6] px-3 py-2 text-[13px] leading-relaxed text-slate-800 whitespace-pre-wrap break-words shadow-sm max-h-[360px] overflow-auto">
                <TextoWhatsApp texto={oferta.mensaje} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button type="button" onClick={enviar} disabled={!oferta.opciones.length}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#25d366] hover:bg-[#1ebe5b] text-white text-sm font-bold shadow-sm disabled:opacity-40">
                <MessageCircle size={16} /> Enviar por WhatsApp{movil ? '' : ' Web'}
              </button>
              <button type="button" onClick={copiar}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? 'Copiado' : 'Copiar mensaje'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: COLORES_MOTIVO[candidato.categoria] || '#94a3b8' }} />
              El descuento aplica al primer pago del plan que elija el cliente. Al registrar su pago en Pagos, el cliente sale de esta lista.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
