import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  X, ShieldAlert, User, KeyRound, Copy, Check, Eye, EyeOff, MessageCircle, Monitor, AlertTriangle, Wrench, Tv, CheckCheck, Info,
} from 'lucide-react'
import api from '../../../config/api'
import { useUi } from '../../../context/UiContext'
import { cn } from '../../../utils/cn'
import { normalizarTelefono, abrirWhatsApp } from '../../../utils/telefono'
import { APP_NOMBRE, mensajeAvisoCredenciales, segmentosWhatsApp } from './avisoCredenciales'

// Aviso de mantenimiento: "las credenciales de acceso de FlujoTV cambiaron".
// Muestra el usuario y la contraseña de la cuenta padre y, por cada cliente
// (con todos sus nicknames en esta cuenta), un botón de WhatsApp con el
// mensaje listo. La vista previa reproduce cómo lo verá el cliente.

function CopiarBtn({ valor, etiqueta }) {
  const [ok, setOk] = useState(false)
  const copiar = async () => {
    try { await navigator.clipboard.writeText(valor || ''); setOk(true); setTimeout(() => setOk(false), 1500) } catch { /* sin permiso */ }
  }
  return (
    <button type="button" onClick={copiar} disabled={!valor} title={`Copiar ${etiqueta}`} aria-label={`Copiar ${etiqueta}`}
      className="w-9 h-9 rounded-xl flex items-center justify-center text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 transition-colors">
      {ok ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
    </button>
  )
}

// Texto con el formato de WhatsApp renderizado (sin HTML crudo)
function TextoWhatsApp({ texto }) {
  return texto.split('\n').map((linea, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {segmentosWhatsApp(linea).map((s, j) => {
        if (s.tipo === 'negrita') return <strong key={j} className="font-semibold">{s.valor}</strong>
        if (s.tipo === 'cursiva') return <em key={j}>{s.valor}</em>
        if (s.tipo === 'codigo') return <code key={j} className="font-mono text-[12.5px] px-1.5 py-0.5 rounded-md bg-black/[.06] text-slate-900">{s.valor}</code>
        return <Fragment key={j}>{s.valor}</Fragment>
      })}
    </Fragment>
  ))
}

function VistaWhatsApp({ cliente, texto }) {
  const nombre = cliente?.nombre || cliente?.pantallas?.[0]?.nickname || 'Cliente'
  const hora = new Date().toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="bg-[#075e54] px-4 py-2.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
          {nombre.trim()[0]?.toUpperCase() || '?'}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">{nombre}</p>
          <p className="text-emerald-100/80 text-[11px] truncate">{(cliente?.pantallas || []).map(p => p.nickname).join(' · ')}</p>
        </div>
      </div>
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto"
        style={{ backgroundColor: '#efeae2', backgroundImage: 'radial-gradient(rgba(0,0,0,.035) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
        <div className="ml-auto max-w-[94%] rounded-xl rounded-tr-sm bg-[#d9fdd3] shadow-[0_1px_1px_rgba(0,0,0,.12)] px-3 pt-2 pb-1.5 text-[13.5px] leading-[1.5] text-[#111b21] break-words">
          <TextoWhatsApp texto={texto} />
          <div className="flex items-center justify-end gap-1 mt-1 text-[10.5px] text-slate-500">
            {hora} <CheckCheck size={14} className="text-sky-500" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function AvisoCredencialesModal({ cuentaId, onClose }) {
  const { showToast } = useUi()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [verPwd, setVerPwd] = useState(false)
  const [seleccion, setSeleccion] = useState(null) // clave del cliente en la vista previa
  const [nota, setNota] = useState('')
  const [enviados, setEnviados] = useState(() => new Set())

  useEffect(() => {
    let vivo = true
    api.get(`/admin/cuentas-padre/${encodeURIComponent(cuentaId)}/aviso-credenciales`)
      .then(r => { if (!vivo) return; setDatos(r.data); setSeleccion(r.data.clientes[0]?.clave || null) })
      .catch(e => vivo && setError(e.response?.data?.error || e.message))
    return () => { vivo = false }
  }, [cuentaId])

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const mensajePara = (c) => mensajeAvisoCredenciales({
    nombre: c?.nombre,
    nicknames: (c?.pantallas || []).map(p => p.nickname),
    otrasCuentas: c?.otrasCuentas || [],
    usuario: datos?.usuario,
    contrasena: datos?.contrasena,
    nota,
  })

  const actual = datos?.clientes.find(c => c.clave === seleccion) || null
  const vista = useMemo(() => (datos ? mensajePara(actual) : ''), [datos, actual, nota]) // eslint-disable-line react-hooks/exhaustive-deps
  const totalPantallas = datos?.clientes.reduce((s, c) => s + c.pantallas.length, 0) || 0

  const enviar = (c) => {
    const tel = normalizarTelefono(c.telefono, c.pais)
    const { copiado } = abrirWhatsApp(tel.numero, mensajePara(c))
    setEnviados(s => new Set(s).add(c.clave))
    setSeleccion(c.clave)
    if (!tel.numero) showToast(`${c.nombre || c.pantallas[0]?.nickname} no tiene teléfono: ${copiado ? 'el mensaje quedó copiado, pégalo en su chat con Ctrl+V' : 'elige el chat en WhatsApp'}.`, 'warning')
  }

  const copiarMensaje = async () => {
    try { await navigator.clipboard.writeText(vista); showToast('Mensaje copiado.', 'success') } catch { showToast('No se pudo copiar.', 'error') }
  }

  return (
    <div className="cp-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-[3px] sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="aviso-cred-titulo"
        className="cp-confirm bg-white w-full sm:max-w-5xl max-h-[94dvh] sm:max-h-[92dvh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Encabezado */}
        <div className="relative px-5 sm:px-7 py-5 flex items-start justify-between gap-3 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 55%,#4338ca 100%)' }}>
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-300/30 flex items-center justify-center flex-shrink-0">
              <Wrench size={20} className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 id="aviso-cred-titulo" className="text-lg sm:text-xl font-bold text-white leading-tight">Aviso de cambio de credenciales</h2>
              <p className="text-indigo-200 text-sm">
                {APP_NOMBRE} · Cuenta <span className="font-mono font-bold text-white">{cuentaId}</span>
                {datos && <> · {datos.clientes.length} cliente{datos.clientes.length === 1 ? '' : 's'}, {totalPantallas} pantalla{totalPantallas === 1 ? '' : 's'}</>}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-white/80 hover:bg-white/15 rounded-xl p-2 transition-colors"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {error && <div className="m-5 p-4 rounded-2xl bg-red-50 text-red-700 text-sm flex gap-2"><AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />{error}</div>}
          {!datos && !error && (
            <div className="p-6 space-y-3">{[0, 1, 2].map(i => <div key={i} className="cp-skeleton h-12" />)}</div>
          )}

          {datos && (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-5 p-4 sm:p-6">
              {/* Columna izquierda: leyenda, credenciales y clientes */}
              <div className="space-y-4 min-w-0">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
                  <ShieldAlert size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900 leading-relaxed">
                    <p className="font-semibold mb-1">Credenciales actualizadas por mantenimiento</p>
                    <p>Debido a labores de mantenimiento en la aplicación <strong>{APP_NOMBRE}</strong>, los datos de acceso de esta cuenta cambiaron. Cada cliente recibe el aviso con el <strong>nickname</strong> de la cuenta que debe actualizar, para que sepa exactamente cuál cambió.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <User size={16} className="text-indigo-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Usuario</p>
                      <p className="font-mono font-semibold text-slate-800 truncate">{datos.usuario || <span className="text-red-500 font-sans">Sin usuario</span>}</p>
                    </div>
                    <CopiarBtn valor={datos.usuario} etiqueta="usuario" />
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <KeyRound size={16} className="text-indigo-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Contraseña</p>
                      <p className="font-mono font-semibold text-slate-800 truncate">
                        {datos.contrasena ? (verPwd ? datos.contrasena : '•'.repeat(Math.min(12, datos.contrasena.length))) : <span className="text-red-500 font-sans">Sin contraseña</span>}
                      </p>
                    </div>
                    <button type="button" onClick={() => setVerPwd(v => !v)} disabled={!datos.contrasena} title={verPwd ? 'Ocultar' : 'Mostrar'} aria-label={verPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                      {verPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <CopiarBtn valor={datos.contrasena} etiqueta="contraseña" />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Clientes de esta cuenta</p>
                  {datos.clientes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                      <Monitor size={22} className="mx-auto mb-1.5 text-slate-300" />
                      Esta cuenta no tiene pantallas asignadas a clientes.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {datos.clientes.map(c => {
                        const tel = normalizarTelefono(c.telefono, c.pais)
                        const activo = c.clave === seleccion
                        const enviado = enviados.has(c.clave)
                        return (
                          <li key={c.clave}
                            className={cn('rounded-2xl border px-3 py-2.5 flex items-center gap-3 transition-colors',
                              activo ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-200 hover:border-indigo-200')}>
                            <button type="button" onClick={() => setSeleccion(c.clave)} className="min-w-0 flex-1 text-left" title="Ver el mensaje de este cliente">
                              <p className="font-semibold text-slate-800 truncate">{c.nombre || c.pantallas[0]?.nickname}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {c.pantallas.map(p => (
                                  <span key={p.idPantalla} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-semibold max-w-full">
                                    <Tv size={10} className="flex-shrink-0" /><span className="truncate">{p.nickname}</span>
                                  </span>
                                ))}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1 truncate">
                                {tel.numero ? `+${tel.numero}` : <span className="text-amber-600">sin teléfono</span>}
                                {c.otrasCuentas?.length > 0 && <> · {c.otrasCuentas.length} cuenta{c.otrasCuentas.length > 1 ? 's' : ''} más sin cambio</>}
                              </p>
                            </button>
                            <button type="button" onClick={() => enviar(c)}
                              className={cn('min-h-[40px] px-3.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 flex-shrink-0 transition-colors',
                                enviado ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#25D366] hover:bg-[#1ebe5b] text-white shadow-sm')}>
                              {enviado ? <Check size={15} /> : <MessageCircle size={15} />}
                              {enviado ? 'Enviado' : 'WhatsApp'}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Columna derecha: vista previa tal como la verá el cliente */}
              <div className="flex flex-col min-w-0 gap-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Así lo verá el cliente</p>
                  <button type="button" onClick={copiarMensaje} className="text-xs px-2.5 py-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 flex items-center gap-1">
                    <Copy size={12} /> Copiar mensaje
                  </button>
                </div>
                <div className="h-[460px] lg:h-[520px]">
                  <VistaWhatsApp cliente={actual} texto={vista} />
                </div>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1"><Info size={12} /> Nota adicional (opcional, se agrega a todos los mensajes)</span>
                  <input value={nota} onChange={e => setNota(e.target.value)} maxLength={300} placeholder="Ej.: El cambio aplica desde hoy a las 6:00 p. m."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 sm:px-7 py-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-xs text-slate-400 hidden sm:block">Cada consulta de estas credenciales queda registrada en la bitácora de accesos.</p>
          <button onClick={onClose} className="ml-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold">Cerrar</button>
        </div>
      </div>
    </div>
  )
}
