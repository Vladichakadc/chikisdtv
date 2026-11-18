// Comprobante de renovación — se genera desde el panel Estatus Cliente.
// Dos vistas:
//  · Comprobante: recibo con el último pago del nickname (tabla de ventas /
//    módulo Pagos); se copia como IMAGEN (html-to-image) y se reenvía por
//    WhatsApp (Web Share en móvil; portapapeles + chat en escritorio).
//  · Renovación (solo VENCIDO / PROXIMO A VENCER): mensaje de venta listo
//    para WhatsApp con los precios del Catálogo de venta según el número de
//    pantallas de la CUENTA que se renueva (la fila del Planificador, no el
//    total del cliente); se envía como TEXTO prellenado vía wa.me o se copia.
import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Copy, Check, Tv, Loader2, MessageCircle, Megaphone, Receipt, Eye, EyeOff, KeyRound, Building2, SlidersHorizontal } from 'lucide-react'
import * as htmlToImage from 'html-to-image'
import api from '../../../config/api'
import { cn } from '../../../utils/cn'
import { useUi } from '../../../context/UiContext'
import { formatDate, formatCurrency } from '../../../utils/excelUtils'
import { MARCA_CLIENTE, PAGO_NEQUI, PAGO_LLAVE } from '../../../config/negocio'
import { calcDias, diasLabel } from './rowHelpers'

// Familias del catálogo que entran en la oferta (en este orden). Los meses de
// regalo son la política comercial: Semestral paga 6 y goza 7; Anual paga 12
// y goza 14 — coherente con duracionDias 210/426 del Catálogo de venta.
const FAMILIAS_OFERTA = [
  { match: /mensual/i,   emoji: '📌', mesesPago: 1,  mesesGratis: 0, gancho: 'ideal para ir mes a mes' },
  { match: /semestral/i, emoji: '⭐', mesesPago: 6,  mesesGratis: 1, gancho: '' },
  { match: /anual/i,     emoji: '👑', mesesPago: 12, mesesGratis: 2, gancho: 'el favorito' },
]

const ESTADO_STYLE = {
  VIGENTE:  { bg: '#dcfce7', text: '#15803d' },
  ALERTA:   { bg: '#fef3c7', text: '#b45309' },
  VENCIDO:  { bg: '#fee2e2', text: '#b91c1c' },
  CORTESIA: { bg: '#dbeafe', text: '#1d4ed8' },
}
const chipStyle = (valor) => ESTADO_STYLE[(valor || '').toUpperCase()] || { bg: '#f1f5f9', text: '#475569' }

// El mensaje de renovación aplica a VENCIDO y ALERTA (PROXIMO A VENCER);
// el marcador manual CORTESIA se respeta: a una cortesía no se le cobra.
function esRenovable(row) {
  const estado = (row.estadoReal || '').toUpperCase()
  const alerta = (row.alertaReal || '').toUpperCase()
  return (estado === 'VENCIDO' || estado === 'ALERTA') && alerta !== 'CORTESIA'
}

function tipoPlanDe(row, pago) {
  if (pago?.tipoPlan) return pago.tipoPlan
  if (row.tipoPlan) return row.tipoPlan
  const d = row.duracionPlan != null ? Math.floor(Number(row.duracionPlan)) : null
  return { 14: 'Plan Anual', 7: 'Plan Semestral', 1: 'Plan Mensual' }[d] || '—'
}

function diasRestantesDe(row) {
  return calcDias(row.duracionReal || row.finalizacion) ?? row.diasVencimientoReal ?? row.diasVencimiento ?? null
}

function mesRestanteDe(row) {
  const dias = diasRestantesDe(row)
  if (dias == null) return '—'
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`
  if (dias < 30) return `${dias} día${dias === 1 ? '' : 's'}`
  return `${+(dias / 30).toFixed(1)} meses`
}

// Arma la oferta con precios del Catálogo de venta. Si el cliente tiene un
// número de pantallas con combo exacto en el catálogo (1, 2, 3…) se ofrece el
// combo; si no existe combo para esa cantidad, se ofertan precios por
// pantalla (los de 1 pantalla) — nunca se inventan precios no catalogados.
function ofertasDe(catalogo = [], pantallas = 1) {
  const disponibles = new Set(catalogo.map(p => p.numeroPantallas))
  const exacto = disponibles.has(pantallas)
  const nPrecio = exacto ? pantallas : 1
  const ofertas = FAMILIAS_OFERTA
    .map(f => {
      const plan = catalogo.find(p => f.match.test(p.nombre || '') && p.numeroPantallas === nPrecio)
      return plan ? { ...f, nombre: plan.nombre, precio: Number(plan.precio) } : null
    })
    .filter(Boolean)
  return { ofertas, combo: exacto && pantallas > 1, porPantalla: !exacto && pantallas > 1 }
}

// El mensaje se arma SOLO para la cuenta (fila del Planificador) que se está
// renovando: precio según las pantallas de esa cuenta, no la suma de todas las
// cuentas del cliente. Si el cliente tiene varias cuentas, se nombra la cuenta
// por su nickname para que sepa cuál es la que vence.
function construirMensaje({ row, pantallas, ofertas, combo, porPantalla, identificarCuenta }) {
  const nombre = (row.nombre || '').trim() || (row.nickname || '').trim()
  const dias = diasRestantesDe(row)
  const fechaFin = formatDate(row.duracionReal || row.finalizacion)
  const vencido = dias == null || dias <= 0

  const cuenta = (row.nickname || '').trim()
  const plan = identificarCuenta && cuenta
    ? `el plan de tu cuenta *${cuenta}* de ${MARCA_CLIENTE}`
    : `tu plan de ${MARCA_CLIENTE}`

  let situacion
  if (dias == null)    situacion = `${plan} está pendiente de renovación 😅`
  else if (dias < 0)   situacion = `${plan} se venció el ${fechaFin} 😅`
  else if (dias === 0) situacion = `${plan} vence HOY (${fechaFin}) ⏳`
  else if (dias === 1) situacion = `${plan} vence MAÑANA (${fechaFin}) ⏳`
  else                 situacion = `${plan} vence en ${dias} días (el ${fechaFin}) ⏳`

  const puente = vencido
    ? 'La buena noticia: reactivarlo toma 1 minuto y te mantengo los mismos precios de siempre.'
    : 'Renovando hoy sigues sin cortes — cero interrupciones y los mismos precios de siempre.'

  let intro
  if (combo)            intro = `Como esta cuenta tiene ${pantallas} pantallas, te dejo los precios del combo para renovarla completa:`
  else if (porPantalla) intro = `Esta cuenta tiene ${pantallas} pantallas — estos son los precios por cada pantalla:`
  else                  intro = 'Mira las opciones:'

  const etiqueta = combo ? ` (${pantallas} pantallas)` : ''
  const bullets = ofertas.map(o => {
    const precio = formatCurrency(o.precio)
    if (!o.mesesGratis) {
      return `${o.emoji} *${o.nombre}*${etiqueta}: ${precio} · ${o.mesesPago} mes${o.mesesPago === 1 ? '' : 'es'} — ${o.gancho}`
    }
    const total = o.mesesPago + o.mesesGratis
    const porMes = formatCurrency(Math.round(o.precio / total))
    const cola = o.gancho ? ` — ${o.gancho}` : ''
    return `${o.emoji} *${o.nombre}*${etiqueta}: ${precio} · pagas ${o.mesesPago} meses ¡y te REGALAMOS ${o.mesesGratis === 1 ? '1 mes' : `${o.mesesGratis} meses`}! Son ${total} meses corridos, a ${porMes}/mes${cola}`
  }).join('\n')

  const cierre = vencido
    ? 'Me envías el pantallazo del pago y te reactivo de una, para que no te pierdas ni un segundo. 😉'
    : 'Me envías el pantallazo del pago y te dejo renovado de una, sin que se te corte la señal. 😉'

  return [
    nombre ? `¡Hola, ${nombre}! 📺 ¿Cómo estás?` : '¡Hola! 📺 ¿Cómo estás?',
    `Te escribo rapidito: ${situacion} y no queremos que te quedes sin tus series, películas y deportes en vivo.`,
    `${puente} ${intro}`,
    bullets,
    `Renuevas en un momento:\n📲 Nequi: ${PAGO_NEQUI}\n🔑 Llave: ${PAGO_LLAVE}`,
    cierre,
  ].filter(Boolean).join('\n\n')
}

// Motivo por el que una pantalla del cliente NO está al día
function motivoPendiente(p) {
  if (p.debe) return { label: 'Debe', bg: '#fef3c7', text: '#b45309' }
  if (p.dias == null || p.dias <= 0) return { label: 'Vencida', bg: '#fee2e2', text: '#b91c1c' }
  return { label: 'Sin pago', bg: '#f1f5f9', text: '#475569' }
}

// Interruptor tipo píldora (fuera del área capturada como imagen)
function Interruptor({ activo, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
        activo
          ? 'bg-orange-50 border-orange-300 text-orange-700'
          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
      )}
    >
      <Icon size={12} /> {children}
    </button>
  )
}

// Línea secundaria con cuenta padre / contraseña de una pantalla
function CredencialesLinea({ cuenta, password, mostrarCuenta, mostrarPassword }) {
  if (!mostrarCuenta && !mostrarPassword) return null
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500" style={{ fontFamily: 'ui-monospace,monospace' }}>
      {mostrarCuenta && <span>Cuenta: {cuenta || '—'}</span>}
      {mostrarPassword && <span>Clave: {password || '—'}</span>}
    </div>
  )
}

function FilaCampo({ label, children, doble = false }) {
  return (
    <div className={doble ? '' : 'flex items-center justify-between gap-3'} style={{ padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
      {!doble && <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</span>}
      {children}
    </div>
  )
}

export function ComprobanteModal({ row, onClose }) {
  const { showToast } = useUi()
  const receiptRef = useRef(null)
  const renovable = esRenovable(row)
  const [vista, setVista] = useState(renovable ? 'renovacion' : 'comprobante')
  const [pago, setPago] = useState(null)
  const [telefono, setTelefono] = useState(null)
  const [pantallasCliente, setPantallasCliente] = useState(1)
  const [pantallasDetalle, setPantallasDetalle] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [cargando, setCargando] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const [trabajando, setTrabajando] = useState(false)
  // Personalización del comprobante (no se guarda: es por envío)
  const [ocultas, setOcultas] = useState(() => new Set())
  const [mostrarCuenta, setMostrarCuenta] = useState(false)
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const toggleOculta = (id) => {
    setCopiado(false)
    setOcultas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  useEffect(() => {
    let vivo = true
    if (!row.nickname) { setCargando(false); return }
    api.get(`/admin/planificador/comprobante/${encodeURIComponent(row.nickname)}`, {
      params: row.customerId ? { customerId: row.customerId } : {},
    })
      .then(r => {
        if (!vivo) return
        setPago(r.data.pago)
        setTelefono(r.data.telefono)
        setPantallasCliente(r.data.pantallasCliente || 1)
        setPantallasDetalle(r.data.pantallasDetalle || [])
        setCatalogo(r.data.catalogo || [])
      })
      .catch(() => { if (vivo) showToast('No se pudo consultar el último pago del nickname.', 'error') })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [row, showToast])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Pantallas de la cuenta que se renueva (la fila), no del cliente completo.
  const pantallasCuenta = Math.max(1, Math.floor(Number(row.pantallas)) || 1)
  const identificarCuenta = pantallasCliente > 1
  const { ofertas, combo, porPantalla } = useMemo(
    () => ofertasDe(catalogo, pantallasCuenta),
    [catalogo, pantallasCuenta],
  )
  const mensaje = useMemo(
    () => construirMensaje({ row, pantallas: pantallasCuenta, ofertas, combo, porPantalla, identificarCuenta }),
    [row, pantallasCuenta, ofertas, combo, porPantalla, identificarCuenta],
  )

  const numeroWhatsApp = () => {
    const digitos = (telefono || '').replace(/\D/g, '')
    return digitos.length === 10 && digitos.startsWith('3') ? `57${digitos}` : digitos
  }

  const cambiarVista = (v) => { setVista(v); setCopiado(false) }

  // ── Acciones del comprobante (imagen) ────────────────────────────────────
  const capturar = () => htmlToImage.toBlob(receiptRef.current, {
    pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true,
  })

  const handleCopiarImagen = async () => {
    setTrabajando(true)
    try {
      const blob = await capturar()
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
      showToast('Comprobante copiado como imagen — pégalo donde lo necesites.', 'success')
    } catch (e) {
      showToast(`No se pudo copiar la imagen: ${e.message || e}`, 'error')
    } finally {
      setTrabajando(false)
    }
  }

  const handleWhatsAppImagen = async () => {
    setTrabajando(true)
    // La capacidad de compartir archivos se detecta de forma síncrona (con un
    // File de prueba); si no existe, la pestaña de WhatsApp se abre YA, dentro
    // del gesto del usuario — abrirla después de los await la bloquearía el
    // bloqueador de popups del navegador.
    const probe = new File([''], 'probe.png', { type: 'image/png' })
    const puedeCompartir = typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] })
    const ventana = puedeCompartir ? null : window.open('', '_blank')
    try {
      const blob = await capturar()
      const file = new File([blob], `comprobante-${row.nickname || row.idPantalla}.png`, { type: 'image/png' })
      // Móvil / navegadores con Web Share: hoja nativa con WhatsApp como destino
      if (puedeCompartir) {
        await navigator.share({ files: [file], title: 'Comprobante de renovación' })
        return
      }
      // Escritorio sin share: imagen al portapapeles + chat del cliente para pegarla
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
      const numero = numeroWhatsApp()
      const url = numero ? `https://wa.me/${numero}` : 'https://web.whatsapp.com'
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

  // ── Acciones del mensaje de renovación (texto) ───────────────────────────
  const handleCopiarMensaje = async () => {
    try {
      await navigator.clipboard.writeText(mensaje)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
      showToast('Mensaje de renovación copiado.', 'success')
    } catch (e) {
      showToast(`No se pudo copiar el mensaje: ${e.message || e}`, 'error')
    }
  }

  const handleWhatsAppMensaje = () => {
    // Sin await antes de window.open: se mantiene dentro del gesto del usuario.
    // Se usa api.whatsapp.com directo (el destino oficial de wa.me): el
    // redirect de wa.me reemplaza los emojis del texto por U+FFFD (�).
    const numero = numeroWhatsApp()
    const texto = encodeURIComponent(mensaje)
    const url = numero
      ? `https://api.whatsapp.com/send/?phone=${numero}&text=${texto}`
      : `https://api.whatsapp.com/send/?text=${texto}`
    window.open(url, '_blank')
    showToast(numero
      ? 'WhatsApp abierto con el mensaje listo — solo dale enviar.'
      : 'WhatsApp abierto — elige el chat del cliente; el mensaje va prellenado.', 'success')
  }

  const estado = row.estadoReal || '—'
  const alerta = row.alertaReal || '—'
  const estadoCss = chipStyle(row.estadoReal)
  const alertaCss = chipStyle(row.alertaReal)
  const dias = diasRestantesDe(row)

  // Cliente con varias cuentas: el comprobante lista las pantallas AL DÍA
  // (fecha vigente, sin deuda y con pago registrado) y las VENCIDAS /
  // pendientes. El admin puede ocultar cuentas antes de copiar/enviar; el
  // precio total es la suma de los últimos pagos de las pantallas al día
  // VISIBLES (si quedan 2+), si no, el último pago de esta pantalla.
  const multiCuenta = pantallasDetalle.length >= 2
  const visibles = pantallasDetalle.filter(p => !ocultas.has(p.idPantalla))
  const pantallasAlDia = visibles.filter(p => p.alDia)
  const pantallasPendientes = visibles.filter(p => !p.alDia)
  const consolidado = pantallasAlDia.length >= 2
  const sumaAlDia = pantallasAlDia.reduce((s, p) => s + (Number(p.pago?.precioVenta) || 0), 0)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-100 rounded-2xl shadow-2xl p-4 sm:p-5 my-auto w-full max-w-[400px]">
        {/* Barra superior de acciones */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-700">
            {vista === 'renovacion' ? 'Mensaje de renovación' : 'Comprobante de renovación'}
          </p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors">
            <X size={17} />
          </button>
        </div>

        {/* Pestañas: solo cuando la pantalla está VENCIDA / PROXIMA A VENCER */}
        {renovable && (
          <div className="grid grid-cols-2 gap-1 p-1 mb-3 rounded-xl bg-slate-200/70">
            <button
              onClick={() => cambiarVista('renovacion')}
              className={cn(
                'flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[12px] font-bold transition-all',
                vista === 'renovacion' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Megaphone size={13} /> Renovación
            </button>
            <button
              onClick={() => cambiarVista('comprobante')}
              className={cn(
                'flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[12px] font-bold transition-all',
                vista === 'comprobante' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Receipt size={13} /> Comprobante
            </button>
          </div>
        )}

        {vista === 'renovacion' ? (
          <>
            {/* Contexto de la oferta */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: estadoCss.bg, color: estadoCss.text }}>{estado}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">{diasLabel(dias)}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                Cuenta {row.nickname || row.idPantalla} · {pantallasCuenta} pantalla{pantallasCuenta === 1 ? '' : 's'}
              </span>
              {identificarCuenta && (
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"
                  title="El cliente tiene otras cuentas; el mensaje solo cobra la renovación de esta."
                >
                  Cliente con {pantallasCliente} cuentas · solo se renueva esta
                </span>
              )}
            </div>

            {/* Vista previa estilo WhatsApp */}
            <div className="rounded-xl p-3 shadow-sm" style={{ background: '#ECE5DD' }}>
              <div
                className="rounded-xl rounded-tl-sm px-3.5 py-3 shadow-sm text-[12.5px] leading-relaxed text-slate-800 whitespace-pre-wrap"
                style={{ background: '#DCF8C6' }}
              >
                {cargando
                  ? <span className="flex items-center gap-2 text-slate-500"><Loader2 size={14} className="animate-spin" /> Preparando la oferta…</span>
                  : mensaje}
              </div>
            </div>

            {porPantalla && !cargando && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2">
                El Catálogo de venta no tiene combo de {pantallasCuenta} pantallas — se ofertan precios por pantalla.
              </p>
            )}
            {!cargando && ofertas.length === 0 && (
              <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 mt-2">
                No hay planes activos en el Catálogo de venta para armar la oferta.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <button
                onClick={handleCopiarMensaje}
                disabled={cargando || ofertas.length === 0}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
              >
                {copiado ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
              <button
                onClick={handleWhatsAppMensaje}
                disabled={cargando || ofertas.length === 0}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
              >
                <MessageCircle size={15} />
                WhatsApp
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2.5">
              Va como texto prellenado en WhatsApp; los *asteriscos* se ven en negrita.
              {telefono ? ` Chat directo: ${telefono}.` : ' Sin teléfono registrado: WhatsApp abre para elegir el chat.'}
            </p>
          </>
        ) : (
          <>
            {/* ── Personalizar (fuera del área capturada) ── */}
            <div className="rounded-xl bg-white border border-slate-200 p-3 mb-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                <SlidersHorizontal size={12} /> Personalizar comprobante
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Interruptor activo={mostrarCuenta} onClick={() => { setMostrarCuenta(v => !v); setCopiado(false) }} icon={Building2}>
                  Cuenta padre
                </Interruptor>
                <Interruptor activo={mostrarPassword} onClick={() => { setMostrarPassword(v => !v); setCopiado(false) }} icon={KeyRound}>
                  Contraseña
                </Interruptor>
              </div>
              {(mostrarCuenta || mostrarPassword) && (
                <p className="text-[10px] text-amber-700 mt-1.5">Ojo: la imagen incluirá estos datos de acceso.</p>
              )}

              {multiCuenta && !cargando && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Cuentas del cliente ({pantallasDetalle.length}) · toca para ocultar
                    </p>
                    {ocultas.size > 0 && (
                      <button type="button" onClick={() => { setOcultas(new Set()); setCopiado(false) }} className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-orange-600 hover:underline">
                        Mostrar todas
                      </button>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {pantallasDetalle.map(p => {
                      const oculta = ocultas.has(p.idPantalla)
                      const chip = p.alDia ? { label: 'Al día', bg: '#dcfce7', text: '#15803d' } : motivoPendiente(p)
                      return (
                        <li key={p.idPantalla}>
                          <button
                            type="button"
                            onClick={() => toggleOculta(p.idPantalla)}
                            aria-pressed={!oculta}
                            aria-label={`${oculta ? 'Mostrar' : 'Ocultar'} ${p.nickname} en el comprobante`}
                            className={cn(
                              'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-colors',
                              oculta ? 'border-dashed border-slate-200 bg-slate-50 opacity-60' : 'border-slate-200 bg-white hover:bg-slate-50'
                            )}
                          >
                            {oculta ? <EyeOff size={13} className="text-slate-400 shrink-0" /> : <Eye size={13} className="text-orange-500 shrink-0" />}
                            <span className={cn('text-[11px] font-semibold truncate flex-1', oculta ? 'line-through text-slate-400' : 'text-slate-700')}>
                              {p.nickname}{p.idPantalla === row.idPantalla ? ' (esta)' : ''}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: chip.bg, color: chip.text }}>{chip.label}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* ── El comprobante (área que se captura como imagen) ── */}
            <div ref={receiptRef} className="rounded-xl overflow-hidden shadow-sm" style={{ fontFamily: "'Plus Jakarta Sans','Inter',sans-serif", background: '#ffffff' }}>
              <div className="px-5 py-4 text-white" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg p-1.5" style={{ background: 'rgba(255,255,255,.22)' }}>
                    <Tv size={18} />
                  </div>
                  <div>
                    <p className="font-extrabold leading-tight text-base">Comprobante</p>
                    <p className="text-[10px] uppercase tracking-[.18em]" style={{ color: '#ffedd5' }}>de renovación</p>
                  </div>
                </div>
              </div>

              <div className="px-5 pt-3 pb-1">
                <FilaCampo doble>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Nombre</p>
                      <p className="text-sm font-bold text-slate-800">{row.nombre || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Apellido</p>
                      <p className="text-sm font-bold text-slate-800">{row.apellido || '—'}</p>
                    </div>
                  </div>
                </FilaCampo>
                <FilaCampo label="Nickname">
                  <span className="text-sm font-bold text-slate-800" style={{ fontFamily: 'ui-monospace,monospace' }}>{row.nickname || '—'}</span>
                </FilaCampo>
                {mostrarCuenta && (
                  <FilaCampo label="Cuenta padre">
                    <span className="text-xs font-semibold text-slate-700 truncate" style={{ fontFamily: 'ui-monospace,monospace' }}>{row.cuenta || row.cuentaId || '—'}</span>
                  </FilaCampo>
                )}
                {mostrarPassword && (
                  <FilaCampo label="Contraseña">
                    <span className="text-xs font-semibold text-slate-700" style={{ fontFamily: 'ui-monospace,monospace' }}>{row.password || '—'}</span>
                  </FilaCampo>
                )}
                <FilaCampo label="Tipo Plan">
                  <span className="text-sm font-bold" style={{ color: '#c2410c' }}>{cargando ? '…' : tipoPlanDe(row, pago)}</span>
                </FilaCampo>
                <FilaCampo label="Inicio Plan">
                  <span className="text-sm font-semibold text-slate-700">{(row.inicioReal || row.inicio) ? formatDate(row.inicioReal || row.inicio) : '—'}</span>
                </FilaCampo>
                <FilaCampo label="Fin Plan">
                  <span className="text-sm font-semibold text-slate-700">{(row.duracionReal || row.finalizacion) ? formatDate(row.duracionReal || row.finalizacion) : '—'}</span>
                </FilaCampo>
                <FilaCampo label="Mes Restante">
                  <span className="text-sm font-semibold text-slate-700">{mesRestanteDe(row)}</span>
                </FilaCampo>
                <FilaCampo label="Estado">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: estadoCss.bg, color: estadoCss.text }}>{estado}</span>
                </FilaCampo>
                <FilaCampo label="Alerta">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: alertaCss.bg, color: alertaCss.text }}>{alerta}</span>
                </FilaCampo>
              </div>

              {/* Cliente con varias cuentas: pantallas al día y vencidas/pendientes (solo las visibles) */}
              {!cargando && multiCuenta && pantallasAlDia.length > 0 && (
                <div className="mx-5 mt-2 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#15803d' }}>
                    Pantallas al día ({pantallasAlDia.length})
                  </p>
                  {pantallasAlDia.map(p => (
                    <div key={p.idPantalla} style={{ padding: '3px 0' }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-700 truncate" style={{ fontFamily: 'ui-monospace,monospace' }}>{p.nickname}</span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">vence {formatDate(p.finPlan)}</span>
                        <span className="text-[11px] font-bold text-slate-800 whitespace-nowrap">{formatCurrency(p.pago?.precioVenta)}</span>
                      </div>
                      <CredencialesLinea cuenta={p.cuenta || p.cuentaId} password={p.password} mostrarCuenta={mostrarCuenta} mostrarPassword={mostrarPassword} />
                    </div>
                  ))}
                </div>
              )}
              {!cargando && multiCuenta && pantallasPendientes.length > 0 && (
                <div className="mx-5 mt-2 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#b91c1c' }}>
                    Pantallas vencidas / pendientes ({pantallasPendientes.length})
                  </p>
                  {pantallasPendientes.map(p => {
                    const m = motivoPendiente(p)
                    return (
                      <div key={p.idPantalla} style={{ padding: '3px 0' }}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-700 truncate" style={{ fontFamily: 'ui-monospace,monospace' }}>{p.nickname}</span>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">{p.finPlan ? `${p.dias != null && p.dias <= 0 ? 'venció' : 'vence'} ${formatDate(p.finPlan)}` : 'sin fecha'}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: m.bg, color: m.text }}>{m.label}</span>
                        </div>
                        <CredencialesLinea cuenta={p.cuenta || p.cuentaId} password={p.password} mostrarCuenta={mostrarCuenta} mostrarPassword={mostrarPassword} />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Precio: último pago del nickname, o la suma de las pantallas al día */}
              <div className="mx-5 mt-2 pt-3 pb-2 flex items-center justify-between" style={{ borderTop: '2px dashed #e2e8f0' }}>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    {consolidado ? 'Precio total' : 'Precio'}
                  </p>
                  {consolidado
                    ? <p className="text-[10px] text-slate-400">{pantallasAlDia.length} pantallas al día</p>
                    : pago?.fecha && <p className="text-[10px] text-slate-400">último pago · {formatDate(pago.fecha)}</p>}
                </div>
                <span className="text-2xl font-extrabold" style={{ color: '#ea580c' }}>
                  {cargando
                    ? <Loader2 size={20} className="animate-spin text-slate-300" />
                    : consolidado ? formatCurrency(sumaAlDia)
                    : pago?.precioVenta != null ? formatCurrency(pago.precioVenta) : '—'}
                </span>
              </div>
              {!cargando && consolidado && pantallasPendientes.length > 0 && (
                <p className="px-5 pb-1 text-[10px]" style={{ color: '#b45309' }}>
                  El total solo suma las pantallas al día.
                </p>
              )}
              {!cargando && !consolidado && !pago && (
                <p className="px-5 pb-1 text-[10px]" style={{ color: '#b45309' }}>
                  Sin pagos registrados para este nickname en el módulo de Pagos.
                </p>
              )}

              <div className="px-5 pb-4 pt-1 flex items-center justify-between text-[10px] text-slate-400" style={{ borderTop: '1px solid #f8fafc' }}>
                <span>Pantalla {row.idPantalla}{row.customerId ? ` · ${row.customerId}` : ''}</span>
                <span>Emitido {(() => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}` })()}</span>
              </div>
            </div>

            {/* ── Acciones ── */}
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <button
                onClick={handleCopiarImagen}
                disabled={trabajando || cargando}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
              >
                {copiado ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
              <button
                onClick={handleWhatsAppImagen}
                disabled={trabajando || cargando}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
              >
                {trabajando ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
                WhatsApp
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2.5">
              Se copia y se envía como imagen, con el mismo formato del comprobante.
              {telefono ? ` Chat directo: ${telefono}.` : ''}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
