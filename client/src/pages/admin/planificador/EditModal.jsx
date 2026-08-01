import { useEffect, useState, useMemo } from 'react'
import {
  X, UserPlus, Undo2, KeyRound, User, CalendarRange, Tv,
  Wallet, DollarSign, BadgePercent, Plus, Loader2, MonitorPlay,
  Eye, EyeOff, PencilLine, List,
} from 'lucide-react'
import api from '../../../config/api'
import { useUi } from '../../../context/UiContext'
import { Button } from '../../../components/ui/Button'
import { cn } from '../../../utils/cn'
import { formatDate } from '../../../utils/excelUtils'
import { calcDias, diasLabel, diasLabelClass } from './rowHelpers'

const CSS = `
  @keyframes em-reveal { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }
  .em-reveal { animation: em-reveal .18s ease-out both }
  @media (prefers-reduced-motion: reduce) { .em-reveal { animation: none } }
`

// ─── Primitivas del modal ────────────────────────────────────────────────────

function Field({ label, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', className, ...rest }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className={cn(
        'px-3 py-2 border border-gray-200 rounded-lg text-sm w-full bg-white',
        'focus:outline-none focus:ring-2 focus:ring-brand-primary',
        className,
      )}
      {...rest}
    />
  )
}

function Select({ value, onChange, children, className }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className={cn(
        'px-3 py-2 border border-gray-200 rounded-lg text-sm w-full bg-white',
        'focus:outline-none focus:ring-2 focus:ring-brand-primary',
        className,
      )}
    >
      {children}
    </select>
  )
}

// Interruptor accesible para los bloques condicionales (Debe / Promo)
function Toggle({ checked, onChange, labelOn, labelOff, activeClass = 'bg-brand-primary' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 select-none py-1"
    >
      <span className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        checked ? activeClass : 'bg-gray-300',
      )}>
        <span className={cn(
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[19px]' : 'translate-x-[3px]',
        )} />
      </span>
      <span className={cn('text-sm', checked ? 'text-gray-800 font-medium' : 'text-gray-500')}>
        {checked ? labelOn : labelOff}
      </span>
    </button>
  )
}

// Tarjeta de sección con banda de color (mismos tonos que la tabla: CUENTA/CLIENTE/PLAN)
const SECTION_TONES = {
  blue:    { band: 'bg-blue-700',    border: 'border-blue-100' },
  emerald: { band: 'bg-emerald-700', border: 'border-emerald-100' },
  purple:  { band: 'bg-purple-700',  border: 'border-purple-100' },
}

function Section({ icon: Icon, title, tone, aside, children }) {
  const t = SECTION_TONES[tone] || SECTION_TONES.blue
  return (
    <section className={cn('rounded-2xl border bg-white p-4', t.border)}>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 text-white text-xs font-bold rounded tracking-wide', t.band)}>
          <Icon size={11} /> {title}
        </span>
        {aside}
      </div>
      {children}
    </section>
  )
}

// ─── Modal de edición ────────────────────────────────────────────────────────

export function EditModal({ row, allPantallas, onClose, onSaved, onCreated }) {
  const { showToast } = useUi()

  const [cuentasPadre, setCuentasPadre]   = useState([])
  const [selectedCuentaId, setSelectedCuentaId] = useState(row.cuentaId || '')
  const [assigningNewNickname, setAssigningNewNickname] = useState(false)
  const [clientesList, setClientesList] = useState([])
  const [planes, setPlanes]             = useState([])
  const [showPwd, setShowPwd]           = useState(false)

  useEffect(() => {
    api.get('/admin/cuentas-padre')
      .then(r => setCuentasPadre(r.data || []))
      .catch(() => {})
    api.get('/admin/clients/tabla-clientes')
      .then(r => setClientesList(r.data || []))
      .catch(() => {})
    // Catálogo de planes activos para el combo de Promo
    api.get('/admin/plans')
      .then(r => setPlanes((r.data || []).filter(p => p.activo)))
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
    // La duración siempre se maneja en meses enteros (el Excel de origen traía días/30)
    duracionPlan: row.duracionPlan != null ? Math.round(Number(row.duracionPlan)) : '',
    inicioReal:   row.inicioReal   || '',
    duracionReal: row.duracionReal || '',
    alertaReal:   row.alertaReal   || '',
    debe:         row.debe         ?? false,
    montoDebe:    row.montoDebe    ?? '',
    montoDebeUSD: row.montoDebeUSD ?? '',
    tipoPlan:     row.tipoPlan     || '',
  })
  const [promo, setPromo] = useState(!!row.tipoPlan)
  const [promoCustom, setPromoCustom] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError]   = useState(null)

  // Suma una cantidad entera de meses a una fecha (YYYY-MM-DD) y devuelve YYYY-MM-DD.
  // Se formatea con componentes locales — toISOString() convierte a UTC y puede
  // correr la fecha un día según la zona horaria del navegador.
  const addMonths = (dateStr, months) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    if (isNaN(d.getTime())) return ''
    const m = Math.trunc(Number(months))
    if (!Number.isFinite(m)) return ''
    d.setMonth(d.getMonth() + m)
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-')
  }

  const set = (field) => (val) => setForm(f => {
    const next = { ...f, [field]: val }
    // Fin real = Inicio real + Duración (meses)
    if (field === 'inicioReal' || field === 'duracionPlan') {
      const computed = addMonths(next.inicioReal, next.duracionPlan)
      if (computed) next.duracionReal = computed
    }
    // Al desactivar "Debe" desaparecen ambos montos (COP y USD)
    if (field === 'debe' && !val) { next.montoDebe = ''; next.montoDebeUSD = '' }
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

  // Siguiente slot sugerido para la pantalla adicional: prefijo de la cuenta +
  // (mayor sufijo numérico existente + 1). Ej.: 087-1..087-3 → 087-4.
  const nextPantallaId = useMemo(() => {
    const prefix = (form.cuentaId || row.cuentaId || '').trim()
    if (!prefix) return ''
    const nums = (allPantallas || [])
      .filter(p => p.cuentaId === prefix)
      .map(p => {
        const m = String(p.idPantalla || '').match(/-(\d+)\s*$/)
        return m ? Number(m[1]) : null
      })
      .filter(n => n != null)
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
    return `${prefix}-${next}`
  }, [allPantallas, form.cuentaId, row.cuentaId])

  const [newScreenId, setNewScreenId] = useState('')
  useEffect(() => { setNewScreenId(nextPantallaId) }, [nextPantallaId])

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

  // Crea un slot nuevo en la misma cuenta padre (mismo Usuario IPTV); el backend
  // hereda usuario/contraseña/crédito/fechas de la cuenta y lo marca como Libre.
  const handleCreateScreen = async () => {
    const id = newScreenId.trim()
    if (!id) return
    setCreating(true); setError(null)
    try {
      const r = await api.post('/admin/planificador', {
        idPantalla: id,
        cuentaId: (form.cuentaId || row.cuentaId || '').trim(),
      })
      showToast(`Pantalla ${r.data.idPantalla} creada en la cuenta ${r.data.cuentaId} (mismo Usuario IPTV).`, 'success')
      if (onCreated) onCreated(r.data)
      else onSaved()
    } catch (e) {
      const msg = e.response?.data?.error || e.message
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setCreating(false)
    }
  }

  // Vencimiento en vivo según lo que hay en el formulario
  const diasForm = calcDias(form.duracionReal || form.finalizacion)

  const promoEnCatalogo = planes.some(p => p.nombre === form.tipoPlan)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <style>{CSS}</style>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header — mismo degradado del hero del Planificador */}
        <div className="relative flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ background: 'linear-gradient(135deg,#4a044e 0%,#2e1065 100%)' }}>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Tv size={17} className="text-fuchsia-300" /> Editar Pantalla
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 font-mono text-xs font-bold text-fuchsia-200">
                {row.idPantalla}
              </span>
              {(row.nombre || row.apellido) && (
                <span className="text-xs text-fuchsia-100/70 truncate">{row.nombre} {row.apellido}</span>
              )}
              {form.duracionReal && (
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/90',
                  diasLabelClass(diasForm),
                )}>
                  {formatDate(form.duracionReal)} · {diasLabel(diasForm)}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/15 rounded-lg text-white/70 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0 bg-gray-50/60">
          {error && (
            <div className="em-reveal bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
          )}

          {/* SECCIÓN CUENTA */}
          <Section
            icon={KeyRound}
            title="CUENTA"
            tone="blue"
            aside={<span className="text-[11px] text-gray-400">Los cambios solo afectan a la pantalla <strong>{row.idPantalla}</strong></span>}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Usuario IPTV">
                <Select value={selectedCuentaId} onChange={handleCuentaChange}>
                  <option value="">Seleccionar cuenta…</option>
                  {!cuentasPadre.some(c => c.cuentaId === row.cuentaId) && row.cuentaId && (
                    <option value={row.cuentaId}>{form.cuenta || row.cuenta} · {row.cuentaId} (actual)</option>
                  )}
                  {cuentasPadre.map(c => (
                    <option key={c.cuentaId} value={c.cuentaId}>{c.nombreUsuario} · {c.cuentaId}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Contraseña">
                <div className="relative">
                  <Input value={form.password} onChange={set('password')} type={showPwd ? 'text' : 'password'} className="pr-9" />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    title={showPwd ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
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

            {/* Pantalla adicional: nuevo slot con el mismo Usuario IPTV */}
            <div className="mt-4 rounded-xl border border-dashed border-violet-300 bg-violet-50/60 p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-violet-100 text-violet-600 shrink-0"><MonitorPlay size={16} /></div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-violet-700">Pantalla adicional</p>
                    <p className="text-[11px] text-violet-500">
                      Crea un nuevo slot en esta cuenta manteniendo el mismo Usuario IPTV
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={newScreenId}
                    onChange={setNewScreenId}
                    className="w-32 font-mono text-center border-violet-200 focus:ring-violet-400"
                    placeholder={nextPantallaId || 'ID-1'}
                    aria-label="ID de la nueva pantalla"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateScreen}
                    disabled={creating || !newScreenId.trim()}
                    className="!bg-violet-600 hover:!bg-violet-700 whitespace-nowrap"
                  >
                    {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    {creating ? 'Creando…' : 'Crear pantalla'}
                  </Button>
                </div>
              </div>
            </div>
          </Section>

          {/* SECCIÓN CLIENTE */}
          <Section icon={User} title="CLIENTE" tone="emerald">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nombre">
                {assigningNewNickname ? (
                  <Select value={form.customerId} onChange={handleClienteChange}>
                    <option value="">Seleccionar cliente…</option>
                    {clienteOptions.map(c => (
                      <option key={c.customerId} value={c.customerId}>
                        {c.nombre} {c.apellido} · {c.customerId}
                      </option>
                    ))}
                  </Select>
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
                  <Select value={form.idPantalla} onChange={set('idPantalla')}>
                    {!cuentaPantallaOptions.includes(form.idPantalla) && form.idPantalla && (
                      <option value={form.idPantalla}>{form.idPantalla} (actual)</option>
                    )}
                    {cuentaPantallaOptions.map(id => (
                      <option key={id} value={id}>{id}{id === row.idPantalla ? ' (actual)' : ''}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    value={form.idPantalla}
                    onChange={set('idPantalla')}
                    placeholder="Nuevo ID de pantalla (ej. M049-1)"
                  />
                )}
              </Field>
              <div className="flex flex-col gap-1 sm:col-span-2">
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
                  <Select value={form.nickname} onChange={handleNicknameChange}>
                    <option value="">Seleccionar nickname…</option>
                    {form.nickname && !nicknameOptions.some(o => o.nickname === form.nickname) && (
                      <option value={form.nickname}>{form.nickname} (actual)</option>
                    )}
                    {nicknameOptions.map(o => (
                      <option key={o.nickname} value={o.nickname}>{o.nickname}</option>
                    ))}
                  </Select>
                )}
              </div>
            </div>
          </Section>

          {/* SECCIÓN PLAN */}
          <Section icon={CalendarRange} title="PLAN" tone="purple">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="# Pantallas">
                <Input value={form.pantallas} onChange={set('pantallas')} type="number" min="1" step="1" />
              </Field>
              <Field label="Duración (meses)">
                <Input value={form.duracionPlan} onChange={set('duracionPlan')} type="number" min="0" step="1" placeholder="1, 7, 14…" />
              </Field>
              <Field label="Inicio real">
                <Input value={form.inicioReal} onChange={set('inicioReal')} type="date" />
              </Field>
              <Field label="Fin real">
                <Input value={form.duracionReal} onChange={set('duracionReal')} type="date" />
              </Field>
              <Field label="Alerta" className="sm:col-span-2">
                <Select value={form.alertaReal} onChange={set('alertaReal')}>
                  <option value="">Normal</option>
                  <option value="CORTESIA">CORTESIA</option>
                </Select>
              </Field>
            </div>

            {/* DEBE — al activarse aparecen tarjetas independientes COP y USD */}
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={14} className={form.debe ? 'text-amber-600' : 'text-gray-400'} />
                <Toggle
                  checked={!!form.debe}
                  onChange={v => set('debe')(v)}
                  labelOn="Sí, debe"
                  labelOff="No debe"
                  activeClass="bg-amber-500"
                />
              </div>
              {form.debe && (
                <div className="em-reveal grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 uppercase tracking-wide mb-1.5">
                      <Wallet size={12} /> Deuda en COP
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-amber-600 font-semibold">$</span>
                      <Input
                        value={form.montoDebe}
                        onChange={set('montoDebe')}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Valor en pesos"
                        className="border-amber-200 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 uppercase tracking-wide mb-1.5">
                      <DollarSign size={12} /> Deuda en USD
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-emerald-600 font-semibold">US$</span>
                      <Input
                        value={form.montoDebeUSD}
                        onChange={set('montoDebeUSD')}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Valor en dólares"
                        className="border-emerald-200 focus:ring-emerald-400"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PROMO — al activarse trae el combo de planes creados */}
            <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
              <div className="flex items-center gap-2 mb-1">
                <BadgePercent size={14} className={promo ? 'text-brand-primary' : 'text-gray-400'} />
                <Toggle
                  checked={promo}
                  onChange={checked => {
                    setPromo(checked)
                    if (!checked) { set('tipoPlan')(''); setPromoCustom(false) }
                  }}
                  labelOn="Con promoción"
                  labelOff="Sin promoción"
                />
              </div>
              {promo && (
                <div className="em-reveal mt-2">
                  {promoCustom ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={form.tipoPlan}
                        onChange={set('tipoPlan')}
                        placeholder="Nombre de la promoción u oferta…"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="!px-2.5 whitespace-nowrap"
                        onClick={() => setPromoCustom(false)}
                        title="Elegir del catálogo de planes"
                      >
                        <List size={13} /> Catálogo
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={promoEnCatalogo || !form.tipoPlan ? form.tipoPlan : '__actual__'}
                      onChange={val => {
                        if (val === '__otra__') { setPromoCustom(true); return }
                        if (val === '__actual__') return
                        set('tipoPlan')(val)
                      }}
                    >
                      <option value="">Seleccionar plan o promoción…</option>
                      {form.tipoPlan && !promoEnCatalogo && (
                        <option value="__actual__">{form.tipoPlan} (actual)</option>
                      )}
                      {planes.map(p => (
                        <option key={p.id} value={p.nombre}>
                          {p.nombre} · ${Number(p.precio).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </option>
                      ))}
                      <option value="__otra__">✏️ Otra promoción…</option>
                    </Select>
                  )}
                  <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1.5">
                    <PencilLine size={11} />
                    {promoCustom
                      ? 'Escribe el nombre de la promoción, o vuelve al catálogo de planes.'
                      : 'El combo lista los planes activos del módulo Planes; elige "Otra promoción…" para un texto libre.'}
                  </p>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white flex-shrink-0">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  )
}
