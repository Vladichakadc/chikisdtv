import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { todayStr } from '../../utils/dateUtils'
import {
  Monitor, Clock, AlertTriangle, CheckCircle2,
  Search, Eye, EyeOff, RefreshCw, Tv,
  Pencil, X, FileSpreadsheet, Save, Trash2,
  Link2, Undo2,
  XCircle, Wallet, Gift, DollarSign, Percent,
  Users, Maximize2, Minimize2, KeyRound, Copy, Check,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { formatDate, formatCurrency } from '../../utils/excelUtils'

import { StatCard } from './planificador/StatCard'
import { SortTh, DaysChip } from './planificador/TableBits'
import { CategoryPanel, screenToVentaPrefill, CATEGORY_CONFIG } from './planificador/CategoryPanel'
import { EditModal } from './planificador/EditModal'
import {
  calcDias, getRowVariant, ROW_BG, estadoBadgeVariant, getPlanSortVal,
} from './planificador/rowHelpers'

// ─── Labels de campo para el diff de sincronización ──────────────────────────

const SYNC_CAMPO_LABELS = {
  cuenta:       'Usuario',
  password:     'Contraseña',
  credito:      'Crédito',
  inicio:       'Inicio',
  finalizacion: 'Fin',
}

// ─── Modal informe comparativo de sincronización con Cuentas Padre ────────────

function SyncDiffModal({ diff, canUndo, onUndo, onClose, undoing }) {
  const [soloConCambios, setSoloConCambios] = useState(false)

  const actualizadas  = diff.filter(d => d.status === 'actualizada')
  const sinCambio     = diff.filter(d => d.status === 'sin_cambio')
  const sinPantallas  = diff.filter(d => d.status === 'sin_pantallas')

  const visible = soloConCambios
    ? actualizadas
    : [...actualizadas, ...sinCambio]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-t-2xl px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Link2 size={20} /> Sincronización con Cuentas Padre
            </h2>
            <p className="text-slate-300 text-sm">Campos cuenta · contraseña · crédito · inicio · fin actualizados</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Chips resumen */}
        <div className="flex items-center flex-wrap gap-2.5 px-6 py-4 border-b border-gray-100 flex-shrink-0">
          {actualizadas.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold">
              <Pencil size={13} />
              {actualizadas.length} con cambio{actualizadas.length > 1 ? 's' : ''}
            </span>
          )}
          {sinCambio.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 text-sm font-semibold">
              <CheckCircle2 size={13} />
              {sinCambio.length} sin cambio
            </span>
          )}
          {sinPantallas.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-sm font-semibold">
              <Monitor size={13} />
              {sinPantallas.length} sin pantallas
            </span>
          )}
          <button
            onClick={() => setSoloConCambios(s => !s)}
            className={`ml-auto text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              soloConCambios
                ? 'bg-orange-500 text-white border-orange-500'
                : 'border-gray-300 text-gray-500 hover:border-orange-300 hover:text-orange-600'
            }`}
          >
            {soloConCambios ? 'Mostrar todos' : 'Solo con cambios'}
          </button>
        </div>

        {/* Tabla de diff */}
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50">
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold border-b border-gray-200">ID Cuenta</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold border-b border-gray-200">Usuario IPTV</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold text-center border-b border-gray-200">Pantallas</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold text-center border-b border-gray-200">Estado</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold border-b border-gray-200">Cambios detectados</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    <CheckCircle2 size={28} className="mx-auto mb-2 text-gray-300" />
                    Todos los datos ya estaban sincronizados.
                  </td>
                </tr>
              )}
              {visible.map((item, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-50 ${
                    item.status === 'actualizada' ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono font-bold text-brand-accent whitespace-nowrap">
                    {item.cuentaId}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 max-w-[160px] truncate">
                    {item.cuenta || <span className="text-gray-400 italic">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-600 font-medium">
                    {item.pantallasAfectadas > 0 ? item.pantallasAfectadas : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    {item.status === 'actualizada' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                        <Pencil size={10} /> Actualizada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 text-xs font-semibold">
                        <CheckCircle2 size={10} /> Sin cambio
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {item.cambios.length > 0 ? (
                      <div className="space-y-1">
                        {item.cambios.map((c, j) => (
                          <div key={j} className="flex items-baseline flex-wrap gap-1 text-xs">
                            <span className="font-semibold text-gray-700 whitespace-nowrap">
                              {SYNC_CAMPO_LABELS[c.campo] || c.campo}:
                            </span>
                            <span className="text-red-500 line-through whitespace-nowrap">
                              {c.antes ?? '—'}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-green-700 font-semibold whitespace-nowrap">
                              {c.despues ?? '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-xs text-gray-400">
            <CheckCircle2 size={12} className="inline mr-1 text-green-500" />
            Cambios guardados en la base de datos.
          </p>
          <div className="flex gap-2">
            {canUndo && (
              <button
                onClick={onUndo}
                disabled={undoing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-40 text-sm font-medium transition-colors"
              >
                <Undo2 size={14} /> {undoing ? 'Deshaciendo…' : 'Deshacer sincronización'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function PlanificadorPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useUi()
  const [data, setData]                   = useState(null)
  const [loading, setLoading]             = useState(true)
  const [exporting, setExporting]         = useState(false)
  const [saving, setSaving]               = useState(false)
  const [syncing, setSyncing]             = useState(false)
  const [showSyncDiff, setShowSyncDiff]   = useState(false)
  const [syncDiffData, setSyncDiffData]   = useState([])
  const [error, setError]                 = useState(null)
  const [search, setSearch]               = useState('')
  const [filterStatus, setFilterStatus]   = useState('ALL')
  const [hidePwd, setHidePwd]             = useState({})
  const [editRow, setEditRow]             = useState(null)
  const [sortConfig, setSortConfig]       = useState({ key: 'cuentaId', dir: 'asc' })
  const [prevPantallas, setPrevPantallas] = useState(null)
  const [undoing, setUndoing]             = useState(false)
  const [activePanel, setActivePanel]     = useState(null)
  const [showEstatusPanel, setShowEstatusPanel] = useState(false)
  const [showCuentaData, setShowCuentaData]     = useState(false)
  const [estatusExpanded, setEstatusExpanded]   = useState(false)
  const [showEstatusPwd, setShowEstatusPwd]     = useState(false)
  const [copied, setCopied]                     = useState(false)

  // Guarda una "foto" del estado actual antes de aplicar un cambio, para poder deshacerlo
  const snapshotBeforeChange = () => {
    if (data?.pantallas) setPrevPantallas(data.pantallas)
  }

  const handleUndo = async () => {
    if (!prevPantallas) return
    if (!confirm('¿Deshacer el último cambio realizado en el planificador?')) return
    setUndoing(true)
    try {
      const r = await api.post('/admin/planificador/restore', prevPantallas)
      setData(r.data)
      setPrevPantallas(null)
      showToast(r.data.message, 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setUndoing(false)
    }
  }

  const onSort = (key) => setSortConfig(prev =>
    prev.key === key
      ? prev.dir === 'asc' ? { key, dir: 'desc' } : { key: null, dir: 'asc' }
      : { key, dir: 'asc' }
  )

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const r = await api.get('/admin/planificador')
      setData(r.data)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const r = await api.get('/admin/planificador/export', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      const fecha = todayStr()
      a.href = url
      a.download = `Planificador_Cuentas_${fecha}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast('Excel exportado correctamente', 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleGuardar = async () => {
    setSaving(true)
    try {
      const save = await api.post('/admin/planificador/save-to-excel')
      const refresh = await api.get('/admin/planificador')
      setData(refresh.data)
      showToast(save.data.message, 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    snapshotBeforeChange()
    setSyncing(true)
    try {
      const r = await api.post('/admin/planificador/sync-cuentas-padre')
      setData(r.data)
      if (r.data.diff?.length > 0) {
        setSyncDiffData(r.data.diff)
        setShowSyncDiff(true)
      } else {
        showToast(r.data.message, 'success')
      }
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleSyncUndo = async () => {
    if (!prevPantallas) return
    setUndoing(true)
    try {
      const r = await api.post('/admin/planificador/restore', prevPantallas)
      setData(r.data)
      setPrevPantallas(null)
      setShowSyncDiff(false)
      setSyncDiffData([])
      showToast(r.data.message, 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setUndoing(false)
    }
  }

  useEffect(() => { load() }, [])

  // Auto-abrir panel Estatus Cliente si venimos del Dashboard con esa indicación
  useEffect(() => {
    if (location.state?.openEstatusPanel && !loading) {
      setShowEstatusPanel(true)
      // Limpiar el state para que no se reabra al recargar
      window.history.replaceState({}, '')
    }
  }, [location.state, loading])

  const { rows, stats } = useMemo(() => {
    if (!data) return { rows: [], stats: {} }
    const { pantallas, diasAlerta } = data

    const cuentas       = new Set(pantallas.map(p => p.cuentaId)).size
    const variantes     = pantallas.map(p => getRowVariant(p, diasAlerta))
    const activas       = pantallas.reduce((sum, p) => sum + (Number(p.pantallas) || 0), 0)
    const proximaVencer = variantes.filter(v => v === 'alerta').length
    const libres        = variantes.filter(v => v === 'libre').length

    // ── Indicadores financieros y de negocio ──────────────────────────────
    const asignadas     = pantallas.length - libres
    const vencidas      = variantes.filter(v => v === 'vencido').length
    const deudores      = pantallas.filter(p => p.debe).length
    const cortesias     = variantes.filter(v => v === 'cortesia').length
    const creditoTotal  = pantallas.reduce((s, p) => s + (Number(p.credito) || 0), 0)
    const ocupacion     = pantallas.length ? Math.round((asignadas / pantallas.length) * 100) : 0

    let filtered = pantallas
    const sq = search.toLowerCase()
    if (sq) {
      filtered = filtered.filter(p => {
        const nombreCompleto = `${p.nombre || ''} ${p.apellido || ''}`.toLowerCase()
        const apellidoNombre = `${p.apellido || ''} ${p.nombre || ''}`.toLowerCase()
        return (
          (p.cuentaId || '').toLowerCase().includes(sq) ||
          (p.cuenta || '').toLowerCase().includes(sq) ||
          (p.nombre || '').toLowerCase().includes(sq) ||
          (p.apellido || '').toLowerCase().includes(sq) ||
          nombreCompleto.includes(sq) ||
          apellidoNombre.includes(sq) ||
          (p.nickname || '').toLowerCase().includes(sq) ||
          (p.customerId || '').toLowerCase().includes(sq)
        )
      })
    }
    if (filterStatus !== 'ALL') {
      const target = filterStatus.toLowerCase()
      filtered = filtered.filter(p => getRowVariant(p, diasAlerta) === target)
    }

    filtered = [...filtered].sort((a, b) => {
      if (sortConfig.key) {
        const aVal = getPlanSortVal(a, sortConfig.key)
        const bVal = getPlanSortVal(b, sortConfig.key)
        if (aVal !== bVal) {
          if (aVal == null) return 1
          if (bVal == null) return -1
          const cmp = typeof aVal === 'string'
            ? aVal.localeCompare(bVal, 'es', { sensitivity: 'base' })
            : Number(aVal) - Number(bVal)
          if (cmp !== 0) return sortConfig.dir === 'asc' ? cmp : -cmp
        }
      }
      if (a.cuentaId !== b.cuentaId) return a.cuentaId < b.cuentaId ? -1 : 1
      return a.idPantalla < b.idPantalla ? -1 : 1
    })

    const rows = filtered.map((p, i) => ({
      ...p,
      isGroupStart: i === 0 || filtered[i - 1].cuentaId !== p.cuentaId,
    }))

    return {
      rows,
      stats: {
        cuentas, activas, proximaVencer, libres, diasAlerta, total: pantallas.length,
        vencidas, deudores, cortesias, creditoTotal, ocupacion, asignadas,
      },
    }
  }, [data, search, filterStatus, sortConfig])

  // ── Listas de detalle para las tarjetas inteligentes ──────────────────────
  // Independientes de los filtros de la tabla: cada tarjeta siempre muestra el panorama
  // completo de su categoría de negocio (riesgo, cobranza, cortesías, inventario, cartera).
  const categoryLists = useMemo(() => {
    if (!data) return {}
    const { pantallas, diasAlerta } = data
    const enriched = pantallas.map(p => ({
      ...p,
      _variant: getRowVariant(p, diasAlerta),
      _dias: calcDias(p.duracionReal || p.finalizacion) ?? p.diasVencimientoReal ?? p.diasVencimiento ?? null,
    }))
    const byDiasAsc = (a, b) => (a._dias ?? Infinity) - (b._dias ?? Infinity)
    const byNombre  = (a, b) => [a.nombre, a.apellido].join(' ').localeCompare([b.nombre, b.apellido].join(' '), 'es', { sensitivity: 'base' })
    return {
      alerta:   enriched.filter(p => p._variant === 'alerta').sort(byDiasAsc),
      vencido:  enriched.filter(p => p._variant === 'vencido').sort(byDiasAsc),
      libre:    enriched.filter(p => p._variant === 'libre').sort(byNombre),
      debe:     enriched.filter(p => p.debe).sort((a, b) => (Number(b.montoDebe) || 0) - (Number(a.montoDebe) || 0)),
      cortesia: enriched.filter(p => p._variant === 'cortesia').sort(byDiasAsc),
      credito:  enriched.filter(p => (Number(p.credito) || 0) > 0).sort((a, b) => (Number(b.credito) || 0) - (Number(a.credito) || 0)),
    }
  }, [data])

  // Abre Pagos → "Nueva Venta" con los datos del cliente/pantalla ya pre-cargados,
  // salvo en "Pantallas sin asignar", donde lo que corresponde es asignar un titular
  // a la pantalla libre directamente desde el formulario de edición.
  const handleGenerateVenta = (screen, catKey) => {
    setActivePanel(null)
    if (catKey === 'libre') {
      snapshotBeforeChange()
      setEditRow(screen)
      return
    }
    navigate('/admin/payments', {
      state: {
        prefillVenta: screenToVentaPrefill(screen, catKey),
        prefillSource: CATEGORY_CONFIG[catKey]?.title || 'Planificador',
      },
    })
  }

  const handleCopyWhatsApp = () => {
    const tipoPlanLabel = (d) => {
      if (d === 14) return 'Plan Anual'
      if (d === 7)  return 'Plan Semestral'
      if (d === 1)  return 'Plan Mensual'
      return null
    }
    const lines = [
      `*Estatus Cliente* — ${rows.length} ${rows.length === 1 ? 'registro' : 'registros'}`,
      '',
    ]
    rows.forEach(row => {
      const nombre   = [row.nombre, row.apellido].filter(Boolean).join(' ') || 'Sin asignar'
      const d        = row.duracionPlan != null ? Math.floor(Number(row.duracionPlan)) : null
      const plan     = tipoPlanLabel(d)
      const diasR    = calcDias(row.duracionReal) ?? row.diasVencimientoReal
      const finReal  = row.duracionReal ? formatDate(row.duracionReal) : null
      const iniReal  = row.inicioReal   ? formatDate(row.inicioReal)   : null

      const partes = [`*${nombre}*  |  Pantalla: ${row.idPantalla}`]
      if (row.customerId) partes[0] += `  |  ID: ${row.customerId}`
      if (row.nickname)   partes.push(`Nickname: ${row.nickname}`)

      const planPartes = []
      if (plan)    planPartes.push(plan)
      if (iniReal) planPartes.push(`Ini: ${iniReal}`)
      if (finReal) planPartes.push(`Fin: ${finReal}`)
      if (diasR != null) planPartes.push(`${diasR}d`)
      if (planPartes.length) partes.push(planPartes.join('  |  '))

      const estadoPartes = []
      if (row.estadoReal) estadoPartes.push(`Estado: ${row.estadoReal}`)
      if (row.alertaReal) estadoPartes.push(`Alerta: ${row.alertaReal}`)
      if (estadoPartes.length) partes.push(estadoPartes.join('  |  '))

      if (row.debe) partes.push(`*DEBE${row.montoDebe ? ': ' + formatCurrency(row.montoDebe) : ''}*`)

      lines.push(partes.join('\n'))
      lines.push('')
    })

    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => showToast('No se pudo copiar al portapapeles', 'error'))
  }

  const togglePwd = (id) => setHidePwd(p => ({ ...p, [id]: !p[id] }))

  const handleDelete = async (row) => {
    const cliente = [row.nombre, row.apellido].filter(Boolean).join(' ') || 'sin asignar'
    const ok = window.confirm(
      `¿Eliminar la pantalla ${row.idPantalla} (${cliente})?\n\nPodrás deshacer este cambio con el botón "Deshacer".`
    )
    if (!ok) return
    snapshotBeforeChange()
    try {
      await api.delete(`/admin/planificador/${row.idPantalla}`)
      setData(d => ({ ...d, pantallas: d.pantallas.filter(p => p.idPantalla !== row.idPantalla) }))
      showToast(`Pantalla ${row.idPantalla} eliminada correctamente.`, 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Cargando planificador…</p>
      </div>
    </div>
  )

  if (error) return (
    <Card className="p-8 text-center">
      <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
      <p className="text-red-600 font-medium">{error}</p>
      <Button onClick={load} className="mt-4" variant="secondary"><RefreshCw size={14} /> Reintentar</Button>
    </Card>
  )

  return (
    <div>
      {/* Modal informe comparativo de sincronización */}
      {showSyncDiff && syncDiffData.length > 0 && (
        <SyncDiffModal
          diff={syncDiffData}
          canUndo={!!prevPantallas}
          onUndo={handleSyncUndo}
          onClose={() => setShowSyncDiff(false)}
          undoing={undoing}
        />
      )}

      {/* Modal de edición */}
      {editRow && (
        <EditModal
          row={editRow}
          allPantallas={data?.pantallas}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); load() }}
        />
      )}

      {/* Panel de detalle de tarjeta inteligente */}
      {activePanel && (
        <CategoryPanel
          catKey={activePanel}
          screens={categoryLists[activePanel] || []}
          onClose={() => setActivePanel(null)}
          onGenerate={handleGenerateVenta}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-accent">Planificador</h1>
          <p className="text-gray-500 text-sm mt-1">
            Control de cuentas y asignación de pantallas IPTV · {stats.total} pantallas en {stats.cuentas} cuentas · Alerta: ≤{stats.diasAlerta} días
          </p>
        </div>
        <div className="flex gap-2">
          {prevPantallas && (
            <Button
              onClick={handleUndo} variant="secondary" disabled={undoing}
              className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
            >
              <Undo2 size={15} /> {undoing ? 'Deshaciendo…' : 'Deshacer último cambio'}
            </Button>
          )}
          <Button
            onClick={handleSync} variant="secondary" disabled={syncing}
            className="border-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-white hover:border-brand-accent"
          >
            <Link2 size={15} /> {syncing ? 'Sincronizando…' : 'Sincronizar Cuentas Padre'}
          </Button>
          <Button
            onClick={handleExport} variant="secondary" disabled={exporting}
            className="border-brand-light text-brand-dark hover:bg-brand-light/40 hover:border-brand-primary"
          >
            <FileSpreadsheet size={15} /> {exporting ? 'Exportando…' : 'Exportar a Excel'}
          </Button>
          <Button
            onClick={handleGuardar} variant="secondary" disabled={saving}
            className="border-state-success/30 text-state-success hover:bg-state-success hover:text-white hover:border-state-success"
          >
            <Save size={15} /> {saving ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button onClick={load} variant="primary" className="shadow-md">
            <RefreshCw size={15} /> Actualizar
          </Button>
        </div>
      </div>

      {/* Aviso: pantallas con ID de cuenta desalineado del prefijo de su ID de pantalla */}
      {data?.inconsistencias?.length > 0 && (
        <Card className="p-4 mb-4 border-amber-300 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                {data.inconsistencias.length} pantalla{data.inconsistencias.length === 1 ? '' : 's'} con ID de cuenta desalineado
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                El ID de cuenta no corresponde al grupo de la pantalla — probablemente un error de captura en el Excel de origen.
                Corrígelo editando la pantalla y seleccionando el "Usuario IPTV" correcto.
              </p>
              <ul className="mt-2 space-y-1">
                {data.inconsistencias.map(inc => {
                  const row = data.pantallas.find(p => p.idPantalla === inc.idPantalla)
                  return (
                    <li key={inc.idPantalla} className="flex items-center justify-between gap-2 text-xs text-amber-800">
                      <span className="font-mono">
                        {inc.idPantalla}: cuentaId actual <strong>{inc.cuentaId}</strong> · debería ser <strong>{inc.cuentaIdEsperado}</strong>
                      </span>
                      {row && (
                        <button
                          onClick={() => { snapshotBeforeChange(); setEditRow(row) }}
                          className="shrink-0 text-amber-700 hover:text-amber-900 underline font-medium"
                        >
                          Editar
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={Tv}           label="Cuentas totales"  value={stats.cuentas}       variant="solid"   sub={`${stats.total} pantallas`} />
        <StatCard icon={CheckCircle2} label="Pantallas activas" value={stats.activas}       variant="light" />
        <StatCard icon={Clock}        label="Próx. a vencer"   value={stats.proximaVencer} variant="outline" sub={`≤ ${stats.diasAlerta} días`}
          onClick={() => setActivePanel('alerta')} />
        <StatCard icon={Monitor}      label="Sin asignar"       value={stats.libres}        variant="light"   sub="Pantallas libres"
          onClick={() => setActivePanel('libre')} />
      </div>

      {/* Indicadores financieros y de negocio — haz clic para ver el detalle accionable y generar ventas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={XCircle}    label="Vencidas"            value={stats.vencidas}                variant="outline" tone="red"     sub="Requieren acción inmediata"
          onClick={() => setActivePanel('vencido')} />
        <StatCard icon={Wallet}     label="Cuentas que deben"   value={stats.deudores}                variant="outline" tone="amber"   sub="Pendientes de cobro"
          onClick={() => setActivePanel('debe')} />
        <StatCard icon={Gift}       label="Cortesías activas"   value={stats.cortesias}               variant="outline" tone="purple"  sub="Sin generar ingreso"
          onClick={() => setActivePanel('cortesia')} />
        <StatCard icon={DollarSign} label="Crédito en cartera"  value={formatCurrency(stats.creditoTotal)} variant="light" tone="emerald" sub="Saldo acumulado de cuentas"
          onClick={() => setActivePanel('credito')} />
        <StatCard icon={Percent}    label="Ocupación"           value={`${stats.ocupacion}%`}         variant="light"   tone="orange"  sub={`${stats.asignadas} de ${stats.total} pantallas asignadas`} />
      </div>

      {/* Filters */}
      <Card className="p-4 mb-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, apellido, cuenta, nickname, ID…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
          >
            <option value="ALL">Todos los estados</option>
            <option value="vigente">Vigente</option>
            <option value="alerta">Alerta (próx. vencer)</option>
            <option value="cortesia">Cortesía</option>
            <option value="vencido">Vencido</option>
            <option value="libre">Libre</option>
          </select>
          <span className="text-sm text-gray-400 whitespace-nowrap">{rows.length} filas</span>
          <button
            onClick={() => setShowEstatusPanel(p => !p)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              showEstatusPanel
                ? 'bg-brand-accent text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700'
            )}
          >
            <Users size={14} />
            Estatus Cliente
          </button>
        </div>
      </Card>

      {/* Panel Estatus Cliente — overlay flotante */}
      {showEstatusPanel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm overflow-auto"
          onClick={e => { if (e.target === e.currentTarget) setShowEstatusPanel(false) }}
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
                onClick={handleCopyWhatsApp}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white/80 hover:bg-white/20 border border-white/20 transition-colors"
                title="Copiar para WhatsApp"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
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
                  onClick={() => setShowEstatusPwd(p => !p)}
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
                onClick={() => setShowEstatusPanel(false)}
                className="ml-1 text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div className={cn(
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
                  <th className="sticky top-0 z-10 bg-purple-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Días R.</th>
                  <th className="sticky top-0 z-10 bg-purple-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Estado R.</th>
                  <th className="sticky top-0 z-10 bg-purple-700 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Alerta R.</th>
                  <th className="sticky top-0 z-10 bg-slate-600 px-3 py-2.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Debe</th>
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
                            ? <span className="font-mono text-gray-700">{row.password}</span>
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
                      <td className="px-3 py-2 whitespace-nowrap border-b border-gray-100"><DaysChip dias={diasR} /></td>
                      <td className="px-3 py-2 whitespace-nowrap border-b border-gray-100">
                        {row.estadoReal ? <Badge variant={estadoBadgeVariant(row.estadoReal)}>{row.estadoReal}</Badge> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap border-b border-gray-100">
                        {row.alertaReal ? <Badge variant={estadoBadgeVariant(row.alertaReal)}>{row.alertaReal}</Badge> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap border-b border-gray-100">
                        {row.debe
                          ? <Badge variant="error">{row.montoDebe ? formatCurrency(row.montoDebe) : 'Debe'}</Badge>
                          : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={showCuentaData ? 15 : 12} className="px-4 py-10 text-center text-gray-400">Sin resultados con el filtro actual</td></tr>
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
      )}

      {/* Tabla */}
      <Card className="overflow-hidden">
        <div className="overflow-auto max-h-[38rem] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ui-border hover:[&::-webkit-scrollbar-thumb]:bg-brand-light">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-20 shadow-[0_2px_4px_-2px_rgba(0,0,0,0.2)]">
              <tr className="text-center text-white text-xs font-bold">
                <th colSpan={9} className="py-1.5 bg-blue-700 border-r-2 border-blue-500 tracking-wider">CUENTA</th>
                <th colSpan={5} className="py-1.5 bg-emerald-700 border-r-2 border-emerald-500 tracking-wider">CLIENTE</th>
                <th colSpan={8} className="py-1.5 bg-purple-700 tracking-wider">PLAN</th>
                <th rowSpan={2} className="px-2 py-2 bg-gray-700 w-20 sticky right-0 z-10"></th>
              </tr>
              <tr className="bg-gray-100 text-gray-600 text-left border-b-2 border-gray-300">
                <SortTh colKey="cuentaId"    label="ID"          sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="cuenta"      label="Cuenta"      sortConfig={sortConfig} onSort={onSort} />
                <th className="px-2 py-2 font-semibold whitespace-nowrap">Contraseña</th>
                <SortTh colKey="credito"     label="Crédito"     sortConfig={sortConfig} onSort={onSort} className="text-right" />
                <SortTh colKey="inicio"      label="Inicio"      sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="finalizacion" label="Fin"        sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="dias"        label="Días"        sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="estado"      label="Estado"      sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="alerta"      label="Alerta"      sortConfig={sortConfig} onSort={onSort} className="border-r-2 border-gray-300" />
                <SortTh colKey="nombre"      label="Nombre"      sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="apellido"    label="Apellido"    sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="idPantalla"  label="Pantalla"    sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="customerId"  label="Customer ID" sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="nickname"    label="Nickname"    sortConfig={sortConfig} onSort={onSort} className="border-r-2 border-gray-300" />
                <SortTh colKey="pantallas"   label="#"           sortConfig={sortConfig} onSort={onSort} className="text-center" />
                <SortTh colKey="duracionPlan" label="Duración"   sortConfig={sortConfig} onSort={onSort} className="text-center" />
                <SortTh colKey="tipoPlan"     label="Tipo Plan"  sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="inicioReal"  label="Ini. Real"   sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="duracionReal" label="Fin Real"   sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="diasReal"    label="Días R."     sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="estadoReal"  label="Estado R."   sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="alertaReal"  label="Alerta R."   sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="debe"        label="Debe"        sortConfig={sortConfig} onSort={onSort} className="text-center" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const rv     = getRowVariant(row, stats.diasAlerta)
                const rowBg  = ROW_BG[rv]
                const borderTop = row.isGroupStart ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'
                return (
                  <tr key={`${row.idPantalla}-${i}`} className={`${rowBg} ${borderTop} transition-colors`}>
                    {/* CUENTA */}
                    <td className="px-2 py-1.5 font-bold text-brand-accent whitespace-nowrap">{row.cuentaId}</td>
                    <td className="px-2 py-1.5 font-mono text-gray-900 whitespace-nowrap">{row.cuenta}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        {!hidePwd[row.cuentaId]
                          ? <span className="font-mono text-gray-700">{row.password}</span>
                          : <span className="text-gray-300 tracking-widest">••••••</span>}
                        <button onClick={() => togglePwd(row.cuentaId)} className="text-gray-300 hover:text-gray-600 flex-shrink-0">
                          {!hidePwd[row.cuentaId] ? <EyeOff size={11} /> : <Eye size={11} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-gray-900 text-right whitespace-nowrap">{row.credito ?? '—'}</td>
                    <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">{row.inicio ? formatDate(row.inicio) : '—'}</td>
                    <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">{row.finalizacion ? formatDate(row.finalizacion) : '—'}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap"><DaysChip dias={calcDias(row.finalizacion) ?? row.diasVencimiento} /></td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {row.estado ? <Badge variant={estadoBadgeVariant(row.estado)}>{row.estado}</Badge> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap border-r-2 border-gray-200">
                      {row.alerta ? <Badge variant={estadoBadgeVariant(row.alerta)}>{row.alerta}</Badge> : <span className="text-gray-300">—</span>}
                    </td>
                    {/* CLIENTE */}
                    <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">{row.nombre || <span className="text-gray-400 italic">—</span>}</td>
                    <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">{row.apellido || <span className="text-gray-400 italic">—</span>}</td>
                    <td className="px-2 py-1.5 font-mono font-bold text-brand-accent whitespace-nowrap">{row.idPantalla}</td>
                    <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">{row.customerId || '—'}</td>
                    <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap border-r-2 border-gray-200">{row.nickname || '—'}</td>
                    {/* PLAN */}
                    <td className="px-2 py-1.5 text-center text-gray-900">{row.pantallas}</td>
                    <td className="px-2 py-1.5 text-center text-gray-900 whitespace-nowrap">
                      {row.duracionPlan != null ? Math.floor(Number(row.duracionPlan)) : '—'}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {(() => {
                        if (row.tipoPlan) return <Badge variant="orange">{row.tipoPlan}</Badge>;
                        const d = row.duracionPlan != null ? Math.floor(Number(row.duracionPlan)) : null;
                        if (d === 14) return <Badge variant="success">Plan Anual</Badge>;
                        if (d === 7) return <Badge variant="warning">Plan Semestral</Badge>;
                        if (d === 1) return <Badge variant="neutral">Plan Mensual</Badge>;
                        return d != null ? <Badge variant="error">REVISAR</Badge> : <span className="text-gray-300">—</span>;
                      })()}
                    </td>
                    <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">{row.inicioReal ? formatDate(row.inicioReal) : '—'}</td>
                    <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">{row.duracionReal ? formatDate(row.duracionReal) : '—'}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap"><DaysChip dias={calcDias(row.duracionReal) ?? row.diasVencimientoReal} /></td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {row.estadoReal ? <Badge variant={estadoBadgeVariant(row.estadoReal)}>{row.estadoReal}</Badge> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {row.alertaReal ? <Badge variant={estadoBadgeVariant(row.alertaReal)}>{row.alertaReal}</Badge> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center whitespace-nowrap">
                      {row.debe
                        ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <Badge variant="error">Debe</Badge>
                            {row.montoDebe != null && row.montoDebe !== '' && (
                              <span className="text-xs font-semibold text-red-600">{formatCurrency(row.montoDebe)}</span>
                            )}
                          </div>
                        )
                        : <span className="text-gray-300">—</span>}
                    </td>
                    {/* Acciones */}
                    <td className="px-2 py-1.5 text-center sticky right-0 bg-white z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { snapshotBeforeChange(); setEditRow(row) }}
                          className="p-1.5 rounded text-brand-primary hover:bg-brand-primary hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          className="p-1.5 rounded text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={23} className="px-4 py-12 text-center text-gray-400">
                    <Monitor size={28} className="mx-auto mb-2 text-gray-300" />
                    No se encontraron pantallas con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
