import { useEffect, useMemo, useState } from 'react'
import {
  X, ShieldAlert, User, KeyRound, Copy, Check, Eye, EyeOff, MessageCircle, Monitor, AlertTriangle, RotateCcw, Wrench,
} from 'lucide-react'
import api from '../../../config/api'
import { useUi } from '../../../context/UiContext'
import { cn } from '../../../utils/cn'
import { formatDate } from '../../../utils/excelUtils'
import { normalizarTelefono, urlWhatsAppTexto } from '../../../utils/telefono'
import { mensajeAvisoCredenciales, saludoDe } from './avisoCredenciales'

// Aviso de mantenimiento: "las credenciales de acceso cambiaron". Muestra el
// usuario y la contraseña de la cuenta padre y, por cada nickname que la usa,
// un botón de WhatsApp con el mensaje listo para enviar al cliente.

function CopiarBtn({ valor, etiqueta }) {
  const [ok, setOk] = useState(false)
  const copiar = async () => {
    try { await navigator.clipboard.writeText(valor || ''); setOk(true); setTimeout(() => setOk(false), 1500) } catch { /* sin permiso */ }
  }
  return (
    <button type="button" onClick={copiar} disabled={!valor} title={`Copiar ${etiqueta}`}
      className="w-9 h-9 rounded-xl flex items-center justify-center text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 transition-colors">
      {ok ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
    </button>
  )
}

// Cambia el saludo (primera línea) del texto editado por el de cada cliente
const conSaludo = (texto, pantalla) => {
  const [, ...resto] = texto.split('\n')
  return [saludoDe(pantalla), ...resto].join('\n')
}

export function AvisoCredencialesModal({ cuentaId, onClose }) {
  const { showToast } = useUi()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [verPwd, setVerPwd] = useState(false)
  const [seleccion, setSeleccion] = useState(null) // idPantalla de la vista previa
  const [texto, setTexto] = useState(null)         // null = mensaje sugerido
  const [enviados, setEnviados] = useState(() => new Set())

  useEffect(() => {
    let vivo = true
    api.get(`/admin/cuentas-padre/${encodeURIComponent(cuentaId)}/aviso-credenciales`)
      .then(r => { if (!vivo) return; setDatos(r.data); setSeleccion(r.data.pantallas[0]?.idPantalla || null) })
      .catch(e => vivo && setError(e.response?.data?.error || e.message))
    return () => { vivo = false }
  }, [cuentaId])

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const actual = datos?.pantallas.find(p => p.idPantalla === seleccion) || null
  const mensajePara = (p) => {
    const base = { ...p, usuario: datos?.usuario, contrasena: datos?.contrasena }
    return texto != null ? conSaludo(texto, p || {}) : mensajeAvisoCredenciales(base)
  }
  const vista = useMemo(() => (datos ? mensajePara(actual || {}) : ''), [datos, actual, texto]) // eslint-disable-line react-hooks/exhaustive-deps

  const enviar = (p) => {
    const tel = normalizarTelefono(p.telefono, p.pais)
    window.open(urlWhatsAppTexto(tel.numero, mensajePara(p)), '_blank', 'noopener')
    setEnviados(s => new Set(s).add(p.idPantalla))
    if (!tel.numero) showToast(`${p.nickname || p.idPantalla} no tiene teléfono: elige el chat en WhatsApp.`, 'warning')
  }

  const copiarMensaje = async () => {
    try { await navigator.clipboard.writeText(vista); showToast('Mensaje copiado.', 'success') } catch { showToast('No se pudo copiar.', 'error') }
  }

  return (
    <div className="cp-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-[3px] sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="aviso-cred-titulo"
        className="cp-confirm bg-white w-full sm:max-w-4xl max-h-[94vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
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
              <p className="text-indigo-200 text-sm">Cuenta <span className="font-mono font-bold text-white">{cuentaId}</span>
                {datos && <> · {datos.pantallas.length} cliente{datos.pantallas.length === 1 ? '' : 's'} por avisar</>}</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-5 p-4 sm:p-6">
              {/* Columna izquierda: leyenda + credenciales */}
              <div className="space-y-4 min-w-0">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
                  <ShieldAlert size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900 leading-relaxed">
                    <p className="font-semibold mb-1">Credenciales actualizadas por mantenimiento</p>
                    <p>Debido a labores de mantenimiento en la aplicación <strong>FlujoTV</strong>, los datos de acceso de esta cuenta cambiaron. Los clientes deben cerrar sesión e ingresar nuevamente con el usuario y la contraseña que aparecen a continuación.</p>
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
                    <button type="button" onClick={() => setVerPwd(v => !v)} disabled={!datos.contrasena} title={verPwd ? 'Ocultar' : 'Mostrar'}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                      {verPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <CopiarBtn valor={datos.contrasena} etiqueta="contraseña" />
                  </div>
                </div>

                {/* Clientes (nicknames) de la cuenta */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Clientes de esta cuenta</p>
                  {datos.pantallas.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                      <Monitor size={22} className="mx-auto mb-1.5 text-slate-300" />
                      Esta cuenta no tiene pantallas asignadas a clientes.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {datos.pantallas.map(p => {
                        const tel = normalizarTelefono(p.telefono, p.pais)
                        const activo = p.idPantalla === seleccion
                        return (
                          <li key={p.idPantalla}
                            className={cn('rounded-2xl border px-3 py-2.5 flex items-center gap-3 transition-colors',
                              activo ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-200 hover:border-indigo-200')}>
                            <button type="button" onClick={() => setSeleccion(p.idPantalla)} className="min-w-0 flex-1 text-left" title="Ver el mensaje de este cliente">
                              <p className="font-semibold text-slate-800 truncate">{p.nickname || p.nombre || p.idPantalla}</p>
                              <p className="text-xs text-slate-500 truncate">
                                <span className="font-mono">{p.idPantalla}</span>
                                {p.vence && <> · vence {formatDate(p.vence)}</>}
                                {' · '}{tel.numero ? `+${tel.numero}` : <span className="text-amber-600">sin teléfono</span>}
                              </p>
                            </button>
                            <button type="button" onClick={() => enviar(p)}
                              className={cn('min-h-[40px] px-3.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 flex-shrink-0 transition-colors',
                                enviados.has(p.idPantalla)
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-[#25D366] hover:bg-[#1ebe5b] text-white shadow-sm')}>
                              {enviados.has(p.idPantalla) ? <Check size={15} /> : <MessageCircle size={15} />}
                              {enviados.has(p.idPantalla) ? 'Enviado' : 'WhatsApp'}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Columna derecha: vista previa editable del mensaje */}
              <div className="flex flex-col min-h-[320px] min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Mensaje {actual ? <>para <span className="normal-case text-slate-600">{actual.nickname || actual.nombre}</span></> : ''}
                  </p>
                  <div className="flex items-center gap-1">
                    {texto != null && (
                      <button type="button" onClick={() => setTexto(null)} className="text-xs px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center gap-1">
                        <RotateCcw size={12} /> Restaurar
                      </button>
                    )}
                    <button type="button" onClick={copiarMensaje} className="text-xs px-2.5 py-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 flex items-center gap-1">
                      <Copy size={12} /> Copiar
                    </button>
                  </div>
                </div>
                <div className="flex-1 rounded-2xl p-3 sm:p-4" style={{ background: '#e5ddd5' }}>
                  <textarea value={vista} onChange={e => setTexto(e.target.value)} aria-label="Mensaje para WhatsApp"
                    className="w-full h-full min-h-[300px] resize-none rounded-xl rounded-tr-sm bg-[#dcf8c6] text-[13.5px] leading-relaxed text-slate-800 p-3.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60" />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Puedes ajustar el texto: se envía a cada cliente con su propio saludo.</p>
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
