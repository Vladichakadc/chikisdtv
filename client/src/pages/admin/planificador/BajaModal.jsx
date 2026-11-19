// "Dar de baja" desde el Planificador: en un solo paso registra la baja
// completa en el módulo Bajas (con su motivo, para poder analizar por qué se
// van los clientes) y deja la pantalla "Libre", lista para asignar a otro
// cliente. La cuenta y la contraseña no se tocan. Se puede deshacer desde el
// historial del Planificador.
import { useEffect, useState } from 'react'
import { X, UserMinus, Loader2, ChevronDown, Tv, ArrowRight } from 'lucide-react'
import api from '../../../config/api'
import { cn } from '../../../utils/cn'
import { useUi } from '../../../context/UiContext'
import { formatDate } from '../../../utils/excelUtils'
import { TIPOS_FIRE } from '../../../config/equipos'
import { MOTIVOS_BAJA } from '../../../config/motivosBaja'

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400 disabled:bg-gray-50 disabled:text-gray-500'

function Campo({ label, children, hint, className }) {
  return (
    <label className={cn('block', className)}>
      <span className="block text-xs font-semibold text-gray-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
    </label>
  )
}

function SiNo({ value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-gray-300 overflow-hidden text-sm">
      {['NO', 'SI'].map(v => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={cn('px-4 py-2 font-semibold transition-colors', value === v ? 'bg-slate-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
          {v === 'SI' ? 'Sí' : 'No'}
        </button>
      ))}
    </div>
  )
}

export function BajaModal({ row, onClose, onRegistrada }) {
  const { showToast } = useUi()
  const [info, setInfo] = useState(null)
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [verRegistro, setVerRegistro] = useState(false)

  useEffect(() => {
    let vivo = true
    api.get(`/admin/planificador/${encodeURIComponent(row.idPantalla)}/baja`)
      .then(r => { if (!vivo) return; setInfo(r.data.pantalla); setForm(r.data.sugerido) })
      .catch(e => vivo && setError(e.response?.data?.error || 'No se pudo preparar la baja.'))
    return () => { vivo = false }
  }, [row.idPantalla])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !guardando) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, guardando])

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e?.target ? e.target.value : e }))
  const otro = form?.motivo === 'Otro motivo'
  const valido = form && form.motivo && form.fechaBaja && (!otro || form.observaciones.trim())

  const guardar = async () => {
    if (!valido || guardando) return
    setGuardando(true); setError(null)
    try {
      const r = await api.post(`/admin/planificador/${encodeURIComponent(row.idPantalla)}/baja`, form)
      showToast(`Baja ${r.data.baja.idBaja} registrada: ${form.nickname} salió y la pantalla ${row.idPantalla} quedó Libre.`, 'success')
      onRegistrada?.(r.data)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setGuardando(false)
    }
  }

  const cliente = info?.nombre || row.nickname

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-auto"
      onClick={e => { if (e.target === e.currentTarget && !guardando) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] my-auto" role="dialog" aria-modal="true" aria-label="Dar de baja">
        <div className="rounded-t-2xl px-5 py-4 flex items-center justify-between text-white bg-gradient-to-r from-rose-700 to-rose-500">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2"><UserMinus size={20} /></div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Dar de baja</h2>
              <p className="text-white/85 text-xs">{row.nickname} · pantalla {row.idPantalla}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={guardando} aria-label="Cerrar" className="p-2 rounded-lg hover:bg-white/15 text-white/80 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {!form && !error && (
          <div className="p-10 flex justify-center text-gray-400"><Loader2 className="animate-spin" /></div>
        )}
        {!form && error && <div className="p-6 text-sm text-red-600">{error}</div>}

        {form && (
          <div className="p-5 space-y-5">
            {/* Qué va a pasar */}
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-800 truncate">{cliente}</p>
                <p className="text-xs text-gray-500">
                  {info?.vence ? `Plan hasta ${formatDate(info.vence)}` : 'Sin fecha de vencimiento'}
                  {info?.activacion ? ` · cliente desde ${formatDate(info.activacion)}` : ''}
                </p>
              </div>
              <ArrowRight size={16} className="text-gray-400 shrink-0" />
              <div className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600">
                <Tv size={13} /> Libre
              </div>
            </div>

            {/* Motivo: lo más importante del formulario */}
            <fieldset>
              <legend className="text-sm font-bold text-gray-800">¿Por qué se va el cliente?</legend>
              <p className="text-xs text-gray-500 mb-2">Con el motivo, el Análisis de Bajas muestra qué está haciendo perder clientes.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MOTIVOS_BAJA.map(m => {
                  const activo = form.motivo === m.nombre
                  return (
                    <button key={m.clave} type="button" onClick={() => set('motivo')(m.nombre)} aria-pressed={activo}
                      className={cn('text-left rounded-xl border px-3 py-2 transition-colors',
                        activo ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50')}>
                      <span className={cn('block text-sm font-semibold', activo ? 'text-rose-800' : 'text-gray-800')}>{m.nombre}</span>
                      {m.ayuda && <span className="block text-[11px] text-gray-500 leading-snug">{m.ayuda}</span>}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Fecha de la baja">
                <input type="date" value={form.fechaBaja} onChange={set('fechaBaja')} className={inputCls} />
              </Campo>
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-1">¿Devolvió el dispositivo?</span>
                <SiNo label="Devolución del dispositivo" value={form.devolucion} onChange={set('devolucion')} />
              </div>
            </div>

            <Campo label={otro ? 'Observaciones (obligatorio con "Otro motivo")' : 'Observaciones'}>
              <textarea rows={2} value={form.observaciones} onChange={set('observaciones')} className={inputCls}
                placeholder="Lo que dijo el cliente, si piensa volver, etc." />
            </Campo>

            {/* Todos los campos del registro en Bajas, ya llenos */}
            <div className="rounded-xl border border-gray-200">
              <button type="button" onClick={() => setVerRegistro(v => !v)} aria-expanded={verRegistro}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-700">
                <span>Registro en Bajas <span className="font-normal text-gray-400">· {form.idBaja} · llenado con los datos de la pantalla</span></span>
                <ChevronDown size={16} className={cn('transition-transform', verRegistro && 'rotate-180')} />
              </button>
              {verRegistro && (
                <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                  <Campo label="ID baja"><input value={form.idBaja} disabled className={inputCls} /></Campo>
                  <Campo label="Customer ID"><input value={form.customerId} onChange={set('customerId')} className={inputCls} /></Campo>
                  <Campo label="Nombre"><input value={form.nombre} onChange={set('nombre')} className={inputCls} /></Campo>
                  <Campo label="Apellido"><input value={form.apellido} onChange={set('apellido')} className={inputCls} /></Campo>
                  <Campo label="Nickname"><input value={form.nickname} onChange={set('nickname')} className={inputCls} /></Campo>
                  <Campo label="Pantallas"><input type="number" min={1} value={form.pantallas} onChange={set('pantallas')} className={inputCls} /></Campo>
                  <Campo label="Tipo de plan"><input value={form.tipoPlan} onChange={set('tipoPlan')} className={inputCls} /></Campo>
                  <Campo label="Tipo de pantalla">
                    <select value={form.tipoPantalla} onChange={set('tipoPantalla')} className={inputCls}>
                      {['', 'Individual', 'Familiar', 'Revendedor'].map(v => <option key={v} value={v}>{v || '—'}</option>)}
                    </select>
                  </Campo>
                  <Campo label="SKU"><input value={form.sku} onChange={set('sku')} className={inputCls} /></Campo>
                  <Campo label="Tipo de Fire">
                    <select value={form.tipoFire} onChange={set('tipoFire')} className={inputCls}>
                      {['', ...TIPOS_FIRE.filter(t => t !== form.tipoFire), ...(form.tipoFire ? [form.tipoFire] : [])].map(v => <option key={v} value={v}>{v || '—'}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Inicio del último ciclo"><input type="date" value={form.fecha || ''} onChange={set('fecha')} className={inputCls} /></Campo>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-xs font-semibold text-gray-600 mb-1">Cortesía</span>
                      <SiNo label="Cortesía" value={form.cortesia} onChange={set('cortesia')} />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-600 mb-1">Cuenta dedicada</span>
                      <SiNo label="Cuenta dedicada" value={form.cuentaDedicada} onChange={set('cuentaDedicada')} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500">
              La pantalla queda <strong>Libre</strong> (sin cliente ni fechas de plan). La cuenta y la contraseña se conservan. Puedes deshacerlo desde el historial.
            </p>

            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={onClose} disabled={guardando}
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={guardar} disabled={!valido || guardando}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-sm disabled:opacity-40">
                {guardando ? <Loader2 size={15} className="animate-spin" /> : <UserMinus size={15} />} Dar de baja
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
