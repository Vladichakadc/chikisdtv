// Oferta rápida — se genera desde el Catálogo de venta para enviarla por
// WhatsApp a un cliente nuevo, en dos formatos a elección:
//  · Imagen: tarjeta gráfica profesional (misma identidad del comprobante de
//    renovación) que se copia/comparte como PNG vía html-to-image.
//  · Texto: mensaje con formato WhatsApp (negritas y emojis) prellenado.
// El precio sale del plan del catálogo seleccionado y puede cotizarse en
// pesos o en dólares (TRM editable, prellenada desde el módulo Costo Pantalla).
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  X, Copy, Check, MessageCircle, Monitor, Tv, Loader2,
  Image as ImageIcon, AlignLeft, Wrench, MonitorSmartphone, Zap,
  Gift, Smartphone, KeyRound, Globe,
} from 'lucide-react'
import * as htmlToImage from 'html-to-image'
import { cn } from '../../../utils/cn'
import { useUi } from '../../../context/UiContext'
import { formatCurrency, formatUSD } from '../../../utils/excelUtils'
import { MARCA_CLIENTE, PAGO_NEQUI, PAGO_LLAVE } from '../../../config/negocio'

const TRM_POR_DEFECTO = 3700

// Contenido de la oferta — una sola fuente para la tarjeta y el texto
const INCLUYE = [
  { emoji: '✅', texto: '+800 canales HD, latinos y europeos' },
  { emoji: '⚽', texto: 'Deportes en vivo: fútbol nacional e internacional y NBA' },
  { emoji: '🎬', texto: 'Premium: HBO, Fox Premium y exclusivos de Epix y Starz' },
  { emoji: '🍿', texto: '+9.000 películas, series y estrenos 2026 de todas las plataformas: Netflix, Disney, Amazon, Apple TV, HBO y Hulu' },
  { emoji: '🔞', texto: 'Paquetes de adultos (opcionales)' },
]
const SERVICIO = [
  { emoji: '🛠️', Icono: Wrench, texto: 'Instalación y soporte personalizado por videollamada de WhatsApp — te dejamos todo funcionando' },
  { emoji: '📱', Icono: MonitorSmartphone, texto: 'Funciona en TV con sistema Android: TV Box, Watch ONN, celulares y tablets' },
  { emoji: '💡', Icono: Zap, texto: 'También en Fire Stick (Lite, HD y 4K), con actualizaciones que te enviamos constantemente' },
]

function fechaLocal() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

// Duración comercial por familia de plan (mismos meses de regalo que el
// mensaje de renovación del Planificador)
function duracionOferta(plan) {
  const n = plan?.nombre || ''
  if (/mensual/i.test(n))            return { pagas: 1, gratis: 0, totalMeses: 1 }
  if (/semestral/i.test(n))          return { pagas: 6, gratis: 1, totalMeses: 7 }
  if (/anual/i.test(n))              return { pagas: 12, gratis: 2, totalMeses: 14 }
  if (/3\s*\+\s*1|mundial/i.test(n)) return { pagas: 3, gratis: 1, totalMeses: 4 }
  const dias = Math.round(Number(plan?.duracionDias) || 0)
  return { pagas: 0, gratis: 0, totalMeses: dias >= 28 ? Math.round(dias / 30) : 0, dias }
}

function textoDuracion(dur) {
  if (dur.dias != null) return `${dur.dias} días`
  if (!dur.gratis) return `${dur.pagas} mes${dur.pagas === 1 ? '' : 'es'}`
  return `${dur.pagas} meses + ${dur.gratis} DE REGALO → ${dur.totalMeses} meses corridos`
}

function construirOferta({ plan, moneda, trm }) {
  const enUSD = moneda === 'USD'
  const precioDe = (cop) => enUSD ? `USD ${formatUSD(cop / trm)}` : formatCurrency(cop)
  const dur = duracionOferta(plan)
  const pantallas = Number(plan?.numeroPantallas) || 1

  const detalle = [
    `${pantallas} pantalla${pantallas === 1 ? '' : 's'}`,
    textoDuracion(dur),
    dur.totalMeses > 1 ? `sale a ${precioDe(plan.precio / dur.totalMeses)}/mes` : null,
  ].filter(Boolean).join(' · ')

  const pagos = enUSD
    ? `🌎 PayPal (pagos internacionales)\n📲 Nequi: ${PAGO_NEQUI}\n🔑 Llave BreB: ${PAGO_LLAVE}`
    : `📲 Nequi: ${PAGO_NEQUI}\n🔑 Llave BreB: ${PAGO_LLAVE}\n🌎 PayPal (pagos internacionales)`

  return [
    `📺 *${MARCA_CLIENTE} — Servicio de IPTV*\nToda la tele y el streaming en un solo servicio:`,
    INCLUYE.map(i => `${i.emoji} ${i.texto}`).join('\n'),
    SERVICIO.map(s => `${s.emoji} ${s.texto}`).join('\n'),
    `💰 *${plan.nombre}: ${precioDe(plan.precio)}*\n${detalle}`,
    `Medios de pago:\n${pagos}`,
    '¿Activamos el tuyo? Escríbeme y en minutos estás viendo todo. 😉',
  ].join('\n\n')
}

export function OfertaRapidaModal({ plan, planes = [], trmInicial, onClose }) {
  const { showToast } = useUi()
  const cardRef = useRef(null)
  const [planSel, setPlanSel] = useState(plan)
  const [formato, setFormato] = useState('imagen')
  const [moneda, setMoneda] = useState('COP')
  const [trm, setTrm] = useState(() => Math.round(Number(trmInicial) || TRM_POR_DEFECTO))
  const [copiado, setCopiado] = useState(false)
  const [trabajando, setTrabajando] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const disponibles = useMemo(
    () => planes.filter(p => p.activo).sort((a, b) => (a.numeroPantallas - b.numeroPantallas) || (a.precio - b.precio)),
    [planes],
  )
  const trmValida = Number(trm) > 0
  const trmUsada = trmValida ? Number(trm) : TRM_POR_DEFECTO
  const enUSD = moneda === 'USD'
  const precioDe = (cop) => enUSD ? `USD ${formatUSD(cop / trmUsada)}` : formatCurrency(cop)
  const dur = duracionOferta(planSel)
  const pantallas = Number(planSel?.numeroPantallas) || 1
  const mensaje = useMemo(
    () => construirOferta({ plan: planSel, moneda, trm: trmUsada }),
    [planSel, moneda, trmUsada],
  )

  const cambiarFormato = (f) => { setFormato(f); setCopiado(false) }

  // ── Acciones formato imagen ──────────────────────────────────────────────
  const capturar = () => htmlToImage.toBlob(cardRef.current, {
    pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true,
  })

  const handleCopiarImagen = async () => {
    setTrabajando(true)
    try {
      const blob = await capturar()
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
      showToast('Oferta copiada como imagen — pégala en el chat del cliente.', 'success')
    } catch (e) {
      showToast(`No se pudo copiar la imagen: ${e.message || e}`, 'error')
    } finally {
      setTrabajando(false)
    }
  }

  const handleWhatsAppImagen = async () => {
    setTrabajando(true)
    // Detección síncrona de Web Share; si no hay, la pestaña se abre YA
    // (dentro del gesto del usuario) para esquivar el bloqueador de popups
    const probe = new File([''], 'probe.png', { type: 'image/png' })
    const puedeCompartir = typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] })
    const ventana = puedeCompartir ? null : window.open('', '_blank')
    try {
      const blob = await capturar()
      const file = new File([blob], `oferta-${MARCA_CLIENTE.toLowerCase()}.png`, { type: 'image/png' })
      if (puedeCompartir) {
        await navigator.share({ files: [file], title: `Oferta ${MARCA_CLIENTE}` })
        return
      }
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
      const url = 'https://web.whatsapp.com'
      if (ventana && !ventana.closed) ventana.location.href = url
      else window.open(url, '_blank')
      showToast('Imagen copiada — pégala en el chat de WhatsApp con Ctrl+V.', 'success')
    } catch (e) {
      if (ventana && !ventana.closed) ventana.close()
      if (e?.name !== 'AbortError') showToast(`No se pudo preparar el envío: ${e.message || e}`, 'error')
    } finally {
      setTrabajando(false)
    }
  }

  // ── Acciones formato texto ───────────────────────────────────────────────
  const handleCopiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(mensaje)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
      showToast('Oferta copiada — pégala en el chat del cliente.', 'success')
    } catch (e) {
      showToast(`No se pudo copiar la oferta: ${e.message || e}`, 'error')
    }
  }

  const handleWhatsAppTexto = () => {
    // api.whatsapp.com directo (el redirect de wa.me daña los emojis)
    window.open(`https://api.whatsapp.com/send/?text=${encodeURIComponent(mensaje)}`, '_blank')
    showToast('WhatsApp abierto — elige el chat del cliente; la oferta va prellenada.', 'success')
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-100 rounded-2xl shadow-2xl p-4 sm:p-5 my-auto w-full max-w-[420px]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-700">Oferta rápida — {MARCA_CLIENTE}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors">
            <X size={17} />
          </button>
        </div>

        {/* Formato: imagen (tarjeta gráfica) o texto (mensaje WhatsApp) */}
        <div className="grid grid-cols-2 gap-1 p-1 mb-3 rounded-xl bg-slate-200/70">
          <button
            onClick={() => cambiarFormato('imagen')}
            className={cn(
              'flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[12px] font-bold transition-all',
              formato === 'imagen' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <ImageIcon size={13} /> Imagen
          </button>
          <button
            onClick={() => cambiarFormato('texto')}
            className={cn(
              'flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[12px] font-bold transition-all',
              formato === 'texto' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <AlignLeft size={13} /> Texto
          </button>
        </div>

        {/* Plan del catálogo */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {disponibles.map(p => (
            <button
              key={p.id}
              onClick={() => setPlanSel(p)}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-all',
                planSel?.id === p.id
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
              )}
              title={`${formatCurrency(p.precio)} · ${p.numeroPantallas} pantalla${p.numeroPantallas === 1 ? '' : 's'}`}
            >
              <Monitor size={11} /> {p.nombre} · {p.numeroPantallas}p
            </button>
          ))}
        </div>

        {/* Moneda */}
        <div className="flex items-center gap-2 mb-3">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-200/70 flex-1">
            <button
              onClick={() => setMoneda('COP')}
              className={cn(
                'px-2 py-1.5 rounded-lg text-[12px] font-bold transition-all',
                moneda === 'COP' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              $ Pesos (COP)
            </button>
            <button
              onClick={() => setMoneda('USD')}
              className={cn(
                'px-2 py-1.5 rounded-lg text-[12px] font-bold transition-all',
                moneda === 'USD' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              USD Dólares
            </button>
          </div>
          {enUSD && (
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              TRM
              <input
                type="number"
                min="1"
                value={trm}
                onChange={e => setTrm(e.target.value)}
                className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-700 text-right"
              />
            </label>
          )}
        </div>

        {formato === 'imagen' ? (
          <>
            {/* ── Tarjeta gráfica (área que se captura como imagen) ── */}
            <div className="max-h-[52vh] overflow-y-auto rounded-xl">
              <div ref={cardRef} className="rounded-xl overflow-hidden shadow-sm" style={{ fontFamily: "'Plus Jakarta Sans','Inter',sans-serif", background: '#ffffff' }}>
                {/* Cabecera de marca: ícono fijo y ampliado */}
                <div className="relative px-5 pt-5 pb-4 text-white overflow-hidden" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                  <div className="absolute rounded-full" style={{ width: 150, height: 150, right: -45, top: -55, background: 'rgba(255,255,255,.12)' }} />
                  <div className="absolute rounded-full" style={{ width: 90, height: 90, right: 40, bottom: -55, background: 'rgba(255,255,255,.08)' }} />
                  <div className="relative flex items-center gap-3.5">
                    <div className="flex items-center justify-center rounded-2xl flex-shrink-0" style={{ width: 56, height: 56, background: 'rgba(255,255,255,.22)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.35)' }}>
                      <Tv size={32} strokeWidth={2.2} />
                    </div>
                    <div>
                      <p className="font-extrabold leading-none" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>{MARCA_CLIENTE}</p>
                      <p className="text-[10px] uppercase font-bold mt-1" style={{ letterSpacing: '.22em', color: '#ffedd5' }}>Servicio de IPTV</p>
                    </div>
                  </div>
                  <p className="relative text-[11.5px] mt-3 font-medium" style={{ color: 'rgba(255,255,255,.92)' }}>
                    Toda la tele y el streaming en un solo servicio
                  </p>
                </div>

                {/* Incluye */}
                <div className="px-5 pt-3.5 pb-1">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">Incluye</p>
                  {INCLUYE.map((i, idx) => (
                    <div key={idx} className="flex items-start gap-2" style={{ padding: '3px 0' }}>
                      <span className="flex items-center justify-center rounded-full flex-shrink-0 mt-[1px]" style={{ width: 16, height: 16, background: '#dcfce7' }}>
                        <Check size={10.5} strokeWidth={3.2} style={{ color: '#15803d' }} />
                      </span>
                      <p className="text-[11.5px] leading-snug text-slate-700">{i.texto}</p>
                    </div>
                  ))}
                </div>

                {/* Instalación, soporte y dispositivos */}
                <div className="mx-5 mt-2.5 rounded-xl px-3.5 py-2.5" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  {SERVICIO.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-2" style={{ padding: '3px 0' }}>
                      <s.Icono size={13} className="flex-shrink-0 mt-[2px]" style={{ color: '#0284c7' }} />
                      <p className="text-[11px] leading-snug text-slate-600">{s.texto}</p>
                    </div>
                  ))}
                </div>

                {/* Precio del plan seleccionado */}
                <div className="mx-5 mt-3 pt-3 pb-1" style={{ borderTop: '2px dashed #e2e8f0' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{planSel?.nombre}</p>
                      <p className="text-[10.5px] text-slate-500 mt-0.5">
                        {pantallas} pantalla{pantallas === 1 ? '' : 's'}{dur.totalMeses > 1 ? ` · ${dur.totalMeses} meses corridos` : dur.dias != null ? ` · ${dur.dias} días` : ' · 1 mes'}
                      </p>
                      {dur.totalMeses > 1 && (
                        <p className="text-[10.5px] font-semibold mt-0.5" style={{ color: '#c2410c' }}>
                          Sale a {precioDe(planSel.precio / dur.totalMeses)}/mes
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-extrabold leading-none" style={{ fontSize: 27, color: '#ea580c' }}>{precioDe(planSel?.precio || 0)}</p>
                      {dur.gratis > 0 && (
                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#dcfce7', color: '#15803d' }}>
                          <Gift size={10} /> +{dur.gratis} mes{dur.gratis === 1 ? '' : 'es'} de regalo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Medios de pago */}
                <div className="mx-5 mt-2 mb-1 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Medios de pago</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(enUSD
                      ? [[Globe, 'PayPal'], [Smartphone, `Nequi ${PAGO_NEQUI}`], [KeyRound, `Llave BreB ${PAGO_LLAVE}`]]
                      : [[Smartphone, `Nequi ${PAGO_NEQUI}`], [KeyRound, `Llave BreB ${PAGO_LLAVE}`], [Globe, 'PayPal']]
                    ).map(([Icono, texto], idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10.5px] font-bold text-slate-700" style={{ background: '#f1f5f9' }}>
                        <Icono size={11} style={{ color: '#ea580c' }} /> {texto}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="px-5 pb-3.5 pt-2 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Instalación incluida · soporte por WhatsApp</span>
                  <span>Oferta del {fechaLocal()}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <button
                onClick={handleCopiarImagen}
                disabled={trabajando}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
              >
                {copiado ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
              <button
                onClick={handleWhatsAppImagen}
                disabled={trabajando}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
              >
                {trabajando ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
                WhatsApp
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2.5">
              Se copia y se envía como imagen, con el diseño de la tarjeta.
              {enUSD ? ' Cotizada en dólares con la TRM indicada.' : ''}
            </p>
          </>
        ) : (
          <>
            {/* Vista previa estilo WhatsApp */}
            <div className="rounded-xl p-3 shadow-sm" style={{ background: '#ECE5DD' }}>
              <div
                className="rounded-xl rounded-tl-sm px-3.5 py-3 shadow-sm text-[12.5px] leading-relaxed text-slate-800 whitespace-pre-wrap max-h-[46vh] overflow-y-auto"
                style={{ background: '#DCF8C6' }}
              >
                {mensaje}
              </div>
            </div>
            {enUSD && !trmValida && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2">
                TRM inválida — se usa {TRM_POR_DEFECTO.toLocaleString('es-CO')} por defecto.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <button
                onClick={handleCopiarTexto}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                {copiado ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
              <button
                onClick={handleWhatsAppTexto}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm hover:shadow-md"
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
              >
                <MessageCircle size={15} />
                WhatsApp
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2.5">
              Va como texto prellenado en WhatsApp; los *asteriscos* se ven en negrita.
              {enUSD ? ' Cotizada en dólares con la TRM indicada.' : ' Precio del Catálogo de venta en pesos.'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
