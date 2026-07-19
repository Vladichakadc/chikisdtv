import { useEffect, useState, useMemo } from 'react'
import { X, UserPlus, Undo2 } from 'lucide-react'
import api from '../../../config/api'
import { useUi } from '../../../context/UiContext'
import { Button } from '../../../components/ui/Button'
import { cn } from '../../../utils/cn'

// ─── Input helpers para el modal ────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', ...rest }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
      {...rest}
    />
  )
}

// ─── Modal de edición ────────────────────────────────────────────────────────

export function EditModal({ row, allPantallas, onClose, onSaved }) {
  const { showToast } = useUi()
  const [cuentasPadre, setCuentasPadre]   = useState([])
  const [selectedCuentaId, setSelectedCuentaId] = useState(row.cuentaId || '')
  const [assigningNewNickname, setAssigningNewNickname] = useState(false)
  const [clientesList, setClientesList] = useState([])

  useEffect(() => {
    api.get('/admin/cuentas-padre')
      .then(r => setCuentasPadre(r.data || []))
      .catch(() => {})
    api.get('/admin/clients/tabla-clientes')
      .then(r => setClientesList(r.data || []))
      .catch(() => {})
  }, [])

  // Lista de clientes (nombre + apellido) de la tabla de clientes, para asignar un nuevo titular
  const clienteOptions = useMemo(() => {
    return (clientesList || [])
      .filter(c => c.customerId)
      .map(c => ({ customerId: c.customerId, nombre: c.nombre || '', apellido: c.apellido || '' }))
      .sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, 'es', { sensitivity: 'base' }))
  }, [clientesList])

  // Lista de nicknames únicos ya registrados en el planificador, con sus datos de cliente
  const nicknameOptions = useMemo(() => {
    const map = {}
    ;(allPantallas || []).forEach(p => {
      const nick = p.nickname?.trim()
      if (!nick || map[nick]) return
      map[nick] = { nickname: nick, nombre: p.nombre || '', apellido: p.apellido || '', customerId: p.customerId || '' }
    })
    return Object.values(map).sort((a, b) => a.nickname.localeCompare(b.nickname, 'es', { sensitivity: 'base' }))
  }, [allPantallas])

  const [form, setForm] = useState({
    idPantalla:   row.idPantalla   || '',
    cuentaId:     row.cuentaId     || '',
    cuenta:       row.cuenta       || '',
    password:     row.password     || '',
    credito:      row.credito      ?? '',
    inicio:       row.inicio       || '',
    finalizacion: row.finalizacion || '',
    nombre:       row.nombre       || '',
    apellido:     row.apellido     || '',
    customerId:   row.customerId   || '',
    nickname:     row.nickname     || '',
    pantallas:    row.pantallas    ?? 1,
    duracionPlan: row.duracionPlan ?? '',
    inicioReal:   row.inicioReal   || '',
    duracionReal: row.duracionReal || '',
    alertaReal:   row.alertaReal   || '',
    debe:         row.debe         ?? false,
    montoDebe:    row.montoDebe    ?? '',
    tipoPlan:     row.tipoPlan     || '',
  })
  const [promo, setPromo] = useState(!!row.tipoPlan)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  // Suma una cantidad entera de meses a una fecha (YYYY-MM-DD) y devuelve YYYY-MM-DD
  const addMonths = (dateStr, months) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    if (isNaN(d.getTime())) return ''
    const m = Math.trunc(Number(months))
    if (!Number.isFinite(m)) return ''
    d.setMonth(d.getMonth() + m)
    return d.toISOString().split('T')[0]
  }

  const set = (field) => (val) => setForm(f => {
    const next = { ...f, [field]: val }
    // Fin real = Inicio real + Duración (meses)
    if (field === 'inicioReal' || field === 'duracionPlan') {
      const computed = addMonths(next.inicioReal, next.duracionPlan)
      if (computed) next.duracionReal = computed
    }
    // Al desactivar "Debe" el monto adeudado desaparece
    if (field === 'debe' && !val) next.montoDebe = ''
    return next
  })

  // Slots de pantalla (idPantalla) existentes dentro de la cuenta seleccionada,
  // para poder reasignar a cuál pertenece este registro de cliente.
  // Si la cuenta seleccionada no tiene ninguna pantalla registrada, el campo
  // "Pantalla" se habilita como texto libre para ingresar un nuevo ID.
  const cuentaPantallaOptions = useMemo(() => {
    const ids = new Set()
    ;(allPantallas || []).forEach(p => { if (p.cuentaId === form.cuentaId) ids.add(p.idPantalla) })
    return [...ids].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
  }, [allPantallas, form.cuentaId])

  const handleCuentaChange = (cuentaId) => {
    setSelectedCuentaId(cuentaId)
    const cp = cuentasPadre.find(c => c.cuentaId === cuentaId)
    if (!cp) return
    setForm(f => ({
      ...f,
      cuentaId:     cp.cuentaId,
      cuenta:       cp.nombreUsuario || '',
      password:     cp.contrasena    || '',
      credito:      cp.credito       ?? '',
      inicio:       cp.fechaInicio   || '',
      finalizacion: cp.fechaFin      || '',
    }))
  }

  // Si el nickname asignado es "Libre" se limpian los campos de plan real
  const LIBRE_NICKNAME = 'libre'
  const isLibre = (nick) => nick.trim().toLowerCase() === LIBRE_NICKNAME

  const handleNicknameChange = (nickname) => {
    const opt = nicknameOptions.find(o => o.nickname === nickname)
    setForm(f => ({
      ...f,
      nickname,
      ...(opt ? { nombre: opt.nombre, apellido: opt.apellido, customerId: opt.customerId } : {}),
      // Al asignar "Libre" se borran Duración (meses), Inicio real, Fin real, Nombre y Apellido
      ...(isLibre(nickname) ? { duracionPlan: '', inicioReal: '', duracionReal: '', nombre: '', apellido: '' } : {}),
    }))
  }

  // Al asignar un nuevo titular se trae el nombre y el Customer ID del cliente seleccionado
  const handleClienteChange = (customerId) => {
    const cliente = clienteOptions.find(c => c.customerId === customerId)
    setForm(f => ({
      ...f,
      ...(cliente ? { nombre: cliente.nombre, customerId: cliente.customerId } : { customerId }),
    }))
  }

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      await api.put(`/admin/planificador/${row.idPantalla}`, form)
      showToast(`Pantalla ${row.idPantalla} actualizada correctamente.`, 'success')
      onSaved()
    } catch (e) {
      const msg = e.response?.data?.error || e.message
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-brand-accent">Editar Pantalla</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="font-mono font-bold text-brand-accent">{row.idPantalla}</span>
              {' · '}{row.nombre} {row.apellido}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
          )}

          {/* SECCIÓN CUENTA */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 bg-blue-700 text-white text-xs font-bold rounded tracking-wide">CUENTA</span>
              <span className="text-xs text-gray-400">Los cambios solo afectan a la pantalla <strong>{row.idPantalla}</strong></span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Usuario IPTV">
                <select
                  value={selectedCuentaId}
                  onChange={e => handleCuentaChange(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white w-full"
                >
                  <option value="">Seleccionar cuenta…</option>
                  {!cuentasPadre.some(c => c.cuentaId === row.cuentaId) && row.cuentaId && (
                    <option value={row.cuentaId}>{form.cuenta || row.cuenta} · {row.cuentaId} (actual)</option>
                  )}
                  {cuentasPadre.map(c => (
                    <option key={c.cuentaId} value={c.cuentaId}>{c.nombreUsuario} · {c.cuentaId}</option>
                  ))}
                </select>
              </Field>
              <Field label="Contraseña">
                <Input value={form.password} onChange={set('password')} />
              </Field>
              <Field label="Crédito">
                <Input value={form.credito} onChange={set('credito')} type="number" />
              </Field>
              <Field label="Inicio de cuenta">
                <Input value={form.inicio} onChange={set('inicio')} type="date" />
              </Field>
              <Field label="Fin de cuenta">
                <Input value={form.finalizacion} onChange={set('finalizacion')} type="date" />
              </Field>
            </div>
          </section>

          {/* SECCIÓN CLIENTE */}
          <section>
            <div className="mb-3">
              <span className="px-2 py-0.5 bg-emerald-700 text-white text-xs font-bold rounded tracking-wide">CLIENTE</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre">
                {assigningNewNickname ? (
                  <select
                    value={form.customerId}
                    onChange={e => handleClienteChange(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white w-full"
                  >
                    <option value="">Seleccionar cliente…</option>
                    {clienteOptions.map(c => (
                      <option key={c.customerId} value={c.customerId}>
                        {c.nombre} {c.apellido} · {c.customerId}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input value={form.nombre} onChange={set('nombre')} />
                )}
              </Field>
              <Field label="Apellido">
                <Input value={form.apellido} onChange={set('apellido')} />
              </Field>
              <Field label="Customer ID">
                <Input value={form.customerId} onChange={set('customerId')} />
              </Field>
              <Field label="Pantalla">
                {cuentaPantallaOptions.length > 0 ? (
                  <select
                    value={form.idPantalla}
                    onChange={e => set('idPantalla')(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white w-full"
                  >
                    {!cuentaPantallaOptions.includes(form.idPantalla) && form.idPantalla && (
                      <option value={form.idPantalla}>{form.idPantalla} (actual)</option>
                    )}
                    {cuentaPantallaOptions.map(id => (
                      <option key={id} value={id}>{id}{id === row.idPantalla ? ' (actual)' : ''}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={form.idPantalla}
                    onChange={set('idPantalla')}
                    placeholder="Nuevo ID de pantalla (ej. M049-1)"
                  />
                )}
              </Field>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nickname</label>
                  <Button
                    type="button"
                    size="sm"
                    variant={assigningNewNickname ? 'secondary' : 'primary'}
                    className={cn('!px-2.5 !py-1 text-xs shadow-sm', !assigningNewNickname && 'shadow-md')}
                    onClick={() => {
                      setAssigningNewNickname(v => {
                        const next = !v
                        if (next) handleNicknameChange('')
                        return next
                      })
                    }}
                  >
                    {assigningNewNickname
                      ? <><Undo2 size={13} /> Cancelar</>
                      : <><UserPlus size={13} /> Asignar nuevo</>}
                  </Button>
                </div>
                {assigningNewNickname ? (
                  <Input
                    value={form.nickname}
                    onChange={handleNicknameChange}
                    placeholder="Nuevo nickname…"
                  />
                ) : (
                  <select
                    value={form.nickname}
                    onChange={e => handleNicknameChange(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white w-full"
                  >
                    <option value="">Seleccionar nickname…</option>
                    {form.nickname && !nicknameOptions.some(o => o.nickname === form.nickname) && (
                      <option value={form.nickname}>{form.nickname} (actual)</option>
                    )}
                    {nicknameOptions.map(o => (
                      <option key={o.nickname} value={o.nickname}>{o.nickname}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </section>

          {/* SECCIÓN PLAN */}
          <section>
            <div className="mb-3">
              <span className="px-2 py-0.5 bg-purple-700 text-white text-xs font-bold rounded tracking-wide">PLAN</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="# Pantallas">
                <Input value={form.pantallas} onChange={set('pantallas')} type="number" min="1" />
              </Field>
              <Field label="Duración (meses)">
                <Input value={form.duracionPlan} onChange={set('duracionPlan')} type="number" step="0.1" />
              </Field>
              <Field label="Inicio real">
                <Input value={form.inicioReal} onChange={set('inicioReal')} type="date" />
              </Field>
              <Field label="Fin real">
                <Input value={form.duracionReal} onChange={set('duracionReal')} type="date" />
              </Field>
              <Field label="Alerta">
                <select
                  value={form.alertaReal}
                  onChange={e => set('alertaReal')(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
                >
                  <option value="">Normal</option>
                  <option value="CORTESIA">CORTESIA</option>
                </select>
              </Field>
              <Field label="Debe">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!form.debe}
                      onChange={e => set('debe')(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                    />
                    <span className="text-sm text-gray-600">{form.debe ? 'Sí, debe' : 'No debe'}</span>
                  </label>
                  {form.debe && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">$</span>
                      <Input
                        value={form.montoDebe}
                        onChange={set('montoDebe')}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Valor que debe"
                      />
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Promo">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={promo}
                      onChange={e => {
                        const checked = e.target.checked
                        setPromo(checked)
                        if (!checked) set('tipoPlan')('')
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                    />
                    <span className="text-sm text-gray-600">{promo ? 'Con promoción' : 'Sin promoción'}</span>
                  </label>
                  {promo && (
                    <Input
                      value={form.tipoPlan}
                      onChange={set('tipoPlan')}
                      placeholder="Nombre de la promoción u oferta"
                    />
                  )}
                </div>
              </Field>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  )
}
