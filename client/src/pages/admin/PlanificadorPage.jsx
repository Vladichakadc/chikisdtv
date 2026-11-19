import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { todayStr } from '../../utils/dateUtils'
import {
  Monitor, Clock, AlertTriangle, CheckCircle2, Search, RefreshCw, Tv, FileSpreadsheet, Undo2, History, XCircle, Wallet, Gift, DollarSign, Percent, Package, Users, Building2, ChevronDown, Pencil, Trash2, Link2,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { PlanificadorTable } from '../../components/ui/PlanificadorTable'
import { useCredenciales } from '../../hooks/useCredenciales'
import { formatCurrency } from '../../utils/excelUtils'

import { StatCard } from './planificador/StatCard'
import { CategoryPanel, screenToVentaPrefill, CATEGORY_CONFIG } from './planificador/CategoryPanel'
import { EditModal } from './planificador/EditModal'
import { ComprobanteModal } from './planificador/ComprobanteModal'
import { RecordatorioLote } from './planificador/RecordatorioLote'
import { RenovarModal } from './planificador/RenovarModal'
import { HistorialPanel, ACCIONES, puedeDeshacer, deshacerCambioApi } from './planificador/HistorialPanel'
import { CSS } from './planificador/planificadorStyles'
import { CuentasPadreAlertPanel } from './planificador/CuentasPadreAlertPanel'
import { EstatusClientePanel } from './planificador/EstatusClientePanel'
import { usePlanificadorVista } from './planificador/usePlanificadorVista'
import { SyncDiffModal } from './planificador/SyncDiffModal'

const DIAS_ALERTA_CP = 30

// ─── Página principal ────────────────────────────────────────────────────────

export default function PlanificadorPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useUi()
  const [data, setData]                   = useState(null)
  const [loading, setLoading]             = useState(true)
  const [exporting, setExporting]         = useState(false)
  const [error, setError]                 = useState(null)
  const [search, setSearch]               = useState('')
  const [filterStatus, setFilterStatus]   = useState('ALL')
  const [pwdVisible, setPwdVisible]       = useState({})
  const { passwords, revelar, olvidar }   = useCredenciales()
  const [editRow, setEditRow]             = useState(null)
  const [sortConfig, setSortConfig]       = useState({ key: 'cuentaId', dir: 'asc' })
  const [undoing, setUndoing]             = useState(false)
  // Sincronizar CP: trae del módulo Cuentas Padre fechas, usuario, crédito y
  // contraseñas (estas siguen cifradas allí) y muestra el informe por cuenta.
  const [syncing, setSyncing]             = useState(false)
  const [syncDiff, setSyncDiff]           = useState(null)
  const [syncLote, setSyncLote]           = useState(null)
  // Historial en el servidor: último cambio deshacible y lote de la última sincronización
  const [ultimoCambio, setUltimoCambio]   = useState(null)
  const [showHistorial, setShowHistorial] = useState(false)
  const [renovarRow, setRenovarRow]       = useState(null)
  const [activePanel, setActivePanel]     = useState(null)
  const [explain, setExplain]             = useState(null)
  const [showEstatusPanel, setShowEstatusPanel] = useState(false)
  const [comprobanteRow, setComprobanteRow] = useState(null)
  const [showCpPanel, setShowCpPanel]           = useState(false)
  const [cpPanelVariante, setCpPanelVariante]   = useState('vencida')
  const [showCapacidad, setShowCapacidad]       = useState(false)

  // Deshacer = revertir en el servidor el último cambio del historial (ya no se
  // reenvía una copia de toda la tabla desde el navegador, que podía borrar
  // trabajo hecho entretanto en otra pestaña).
  const loadUltimoCambio = async () => {
    try {
      const r = await api.get('/admin/planificador/historial', { params: { limit: 20 } })
      setUltimoCambio((r.data.cambios || []).find(puedeDeshacer) || null)
    } catch { setUltimoCambio(null) }
  }

  const handleUndo = async () => {
    const c = ultimoCambio
    if (!c) return
    const que = `${ACCIONES[c.accion]?.label || c.accion} de ${c.accion === 'sincronizar' ? 'la sincronización' : c.idPantalla}`
    const extra = c.accion === 'renovar' && c.ventaId ? `\nTambién se eliminará la venta ${c.ventaId} de Pagos.` : ''
    if (!confirm(`¿Deshacer el último cambio? (${que})${extra}`)) return
    setUndoing(true)
    const ok = await deshacerCambioApi(c, showToast)
    setUndoing(false)
    if (ok) { await load(); loadRecordatorios() }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const r = await api.post('/admin/planificador/sync-cuentas-padre')
      setSyncLote(r.data.lote || null)
      await load()
      if (r.data.diff?.length > 0) setSyncDiff(r.data.diff)
      showToast(r.data.message, 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleSyncUndo = async () => {
    if (!syncLote) return
    setUndoing(true)
    const ok = await deshacerCambioApi({ accion: 'sincronizar', lote: syncLote }, showToast)
    setUndoing(false)
    if (ok) { setSyncLote(null); setSyncDiff(null); await load() }
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
      loadUltimoCambio()
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


  // Recordatorios de renovación enviados (últimos 30 días): alimentan
  // "Recordado hace N días" y la efectividad en Vencidas / Próx. a vencer.
  const [recordatorios, setRecordatorios] = useState(null)
  const [lote, setLote] = useState(null) // { catKey, screens } — Recordar a todos
  const loadRecordatorios = async () => {
    try {
      const r = await api.get('/admin/planificador/recordatorios/resumen', { params: { dias: 30 } })
      setRecordatorios(r.data)
    } catch { /* no bloquea el Planificador */ }
  }

  useEffect(() => { load(); loadRecordatorios() }, [])

  // Auto-abrir panel Estatus Cliente si venimos del Dashboard con esa indicación
  useEffect(() => {
    if (loading || !location.state) return
    const { openEstatusPanel, abrirCategoria, buscar } = location.state
    if (openEstatusPanel) setShowEstatusPanel(true)
    // Desde el Dashboard ("Hoy al aire" / "Guía de renovaciones")
    if (abrirCategoria) setActivePanel(abrirCategoria)
    if (buscar) setSearch(buscar)
    // Limpiar el state para que no se reabra al recargar
    if (openEstatusPanel || abrirCategoria || buscar) window.history.replaceState({}, '')
  }, [location.state, loading])

  const { rows, stats, categoryLists, cpVencidas, cpAlerta } = usePlanificadorVista(data, { search, filterStatus, sortConfig })

  // Abre Pagos → "Nueva Venta" con los datos del cliente/pantalla ya pre-cargados,
  // salvo en "Pantallas sin asignar", donde lo que corresponde es asignar un titular
  // a la pantalla libre directamente desde el formulario de edición.
  const handleGenerateVenta = (screen, catKey) => {
    setActivePanel(null)
    if (catKey === 'libre') {
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

  // Contraseñas ocultas por defecto: al revelar una cuenta se piden al backend
  // y queda registrado quién las vio (motivo "tabla").
  const togglePwd = async (cuentaId) => {
    if (pwdVisible[cuentaId]) { setPwdVisible(p => ({ ...p, [cuentaId]: false })); return }
    const ids = (data?.pantallas || []).filter(p => p.cuentaId === cuentaId).map(p => p.idPantalla)
    if (await revelar(ids, 'tabla')) setPwdVisible(p => ({ ...p, [cuentaId]: true }))
  }

  // Cada recarga del Planificador vuelve a ocultar las contraseñas (pudieron
  // cambiar al editar o sincronizar con Cuentas Padre).
  useEffect(() => { olvidar(); setPwdVisible({}) }, [data, olvidar])

  const handleDelete = async (row) => {
    const cliente = [row.nombre, row.apellido].filter(Boolean).join(' ') || 'sin asignar'
    const ok = window.confirm(
      `¿Eliminar la pantalla ${row.idPantalla} (${cliente})?\n\nPodrás deshacer este cambio con el botón "Deshacer".`
    )
    if (!ok) return
    try {
      await api.delete(`/admin/planificador/${row.idPantalla}`)
      setData(d => ({ ...d, pantallas: d.pantallas.filter(p => p.idPantalla !== row.idPantalla) }))
      loadUltimoCambio()
      showToast(`Pantalla ${row.idPantalla} eliminada correctamente.`, 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="pl-skeleton w-48 h-3 mx-auto mb-4 rounded-full" />
        <div className="pl-skeleton w-32 h-2 mx-auto rounded-full" />
        <p className="text-purple-400 text-sm mt-4 font-medium">Cargando planificador…</p>
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
      <style>{CSS}</style>
      {/* Panel de alertas Cuentas Padre */}
      {showCpPanel && (
        <CuentasPadreAlertPanel
          cuentas={cpPanelVariante === 'vencida' ? cpVencidas : cpAlerta}
          titulo={cpPanelVariante === 'vencida'
            ? `${cpVencidas.length} Cuenta${cpVencidas.length !== 1 ? 's' : ''} Padre Vencida${cpVencidas.length !== 1 ? 's' : ''}`
            : `${cpAlerta.length} Cuenta${cpAlerta.length !== 1 ? 's' : ''} Padre en Alerta`}
          variante={cpPanelVariante}
          onClose={() => setShowCpPanel(false)}
          navigate={navigate}
        />
      )}

      {/* Modal de edición — key por idPantalla: fuerza un remount limpio del
          formulario al saltar entre pantallas hermanas (crear/editar), evitando
          que queden campos de la pantalla anterior mezclados con la nueva. */}
      {editRow && (
        <EditModal
          key={editRow.idPantalla}
          row={editRow}
          allPantallas={data?.pantallas}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); load() }}
          onCreated={(nueva) => { setEditRow(nueva); load() }}
          onSwitchPantalla={(sibling) => { setEditRow(sibling) }}
          onDeleteSibling={handleDelete}
        />
      )}

      {/* Informe de la sincronización con Cuentas Padre */}
      {syncDiff && (
        <SyncDiffModal
          diff={syncDiff}
          canUndo={!!syncLote}
          onUndo={handleSyncUndo}
          onClose={() => setSyncDiff(null)}
          undoing={undoing}
        />
      )}

      {/* Panel de detalle de tarjeta inteligente */}
      {activePanel && (
        <CategoryPanel
          catKey={activePanel}
          screens={categoryLists[activePanel] || []}
          onClose={() => setActivePanel(null)}
          onGenerate={handleGenerateVenta}
          onEdit={(screen) => { setActivePanel(null); setEditRow(screen) }}
          onStatus={(screen) => setComprobanteRow(screen)}
          recordatorios={recordatorios}
          onRecordarTodos={(screens) => setLote({ catKey: activePanel, screens })}
          onRenovar={(screen) => setRenovarRow(screen)}
        />
      )}

      {/* ── HERO HEADER ── */}
      <div className="pl-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#4a044e 0%,#2e1065 100%)' }}>
        <div className="pl-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#c026d3,transparent 70%)' }} />
        <div className="pl-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.15] pointer-events-none" style={{ background: 'radial-gradient(circle,#9333ea,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/25 mb-4">
              <Tv size={12} className="text-fuchsia-300" />
              <span className="text-fuchsia-300 text-xs font-semibold tracking-widest uppercase">Operación Core</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Planificador
            </h1>
            <p className="text-fuchsia-100/70 text-sm mt-2">
              Control de cuentas y asignación de pantallas IPTV {!loading && <span className="text-fuchsia-300/50">· {stats.total} pantallas en {stats.cuentas} cuentas · Alerta: ≤{stats.diasAlerta} días</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {ultimoCambio && (
              <button onClick={handleUndo} disabled={undoing}
                title={`Deshacer: ${ACCIONES[ultimoCambio.accion]?.label || ultimoCambio.accion} · ${ultimoCambio.accion === 'sincronizar' ? 'sincronización' : ultimoCambio.idPantalla}`}
                className="pl-btn-ghost px-4 py-2.5 rounded-2xl text-sm font-semibold text-white/80 flex items-center gap-2">
                <Undo2 size={15} /> {undoing ? 'Deshaciendo…' : 'Deshacer'}
              </button>
            )}
            <button onClick={() => setShowHistorial(true)} className="pl-btn-ghost px-4 py-2.5 rounded-2xl text-sm font-semibold text-white/80 flex items-center gap-2">
              <History size={15} /> Historial
            </button>
            <button onClick={handleSync} disabled={syncing} className="pl-btn-ghost relative px-4 py-2.5 rounded-2xl text-sm font-semibold text-white/80 flex items-center gap-2">
              <Link2 size={15} /> {syncing ? 'Sincronizando…' : 'Sincronizar CP'}
              {data?.syncPendiente && !syncing && (
                <span title="Hay cambios en Cuentas Padre por sincronizar" className="absolute -top-1.5 -right-1.5 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" /></span>
              )}
            </button>
            <button onClick={handleExport} disabled={exporting} className="pl-btn-ghost px-4 py-2.5 rounded-2xl text-sm font-semibold text-white/80 flex items-center gap-2">
              <FileSpreadsheet size={15} /> Exportar Excel
            </button>
            <button onClick={load} className="pl-cta px-5 py-2.5 rounded-2xl text-sm font-bold text-white flex items-center gap-2">
              <RefreshCw size={15} /> Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Aviso: pantallas con ID de cuenta desalineado del prefijo de su ID de pantalla */}
      {data?.inconsistencias?.length > 0 && (
        <div className="pl-warning-card p-4 mb-4">
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
                          onClick={() => { setEditRow(row) }}
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
        </div>
      )}

      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />

      {/* Stats — Fila 1 */}
      <div className="pl-a2 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={Tv}           label="Cuentas totales"  value={stats.cuentas}       variant="solid"   tone="indigo"  sub={`${stats.total} pantallas`}
          onClick={() => setExplain({
            title: 'Cuentas totales', value: stats.cuentas, icon: Tv,
            queEs: 'Cuántas cuentas padre distintas tienen pantallas registradas en el Planificador, y cuántas pantallas suman entre todas.',
            comoSeCalcula: 'Se cuentan los **IDs de cuenta únicos** entre las filas del Planificador. Las pantallas son la suma de la columna # — un registro puede valer por 2 o más pantallas.',
            origen: 'Tabla del Planificador. El inventario completo de cuentas (incluidas las que no tienen pantallas) vive en **Cuentas Padre**.',
          })} />
        <StatCard icon={CheckCircle2} label="Pantallas activas" value={stats.activas}       variant="light"   tone="emerald"
          onClick={() => setExplain({
            title: 'Pantallas activas', value: stats.activas, icon: CheckCircle2,
            queEs: 'Pantallas asignadas a un cliente y con el servicio vigente (no vencidas).',
            comoSeCalcula: 'Se suman las pantallas de las filas que tienen cliente asignado y cuya fecha de vencimiento no ha pasado.',
            origen: 'Campos de cliente y fechas de cada fila del Planificador.',
          })} />
        <StatCard icon={Clock}        label="Próx. a vencer"   value={stats.proximaVencer} variant="outline" tone="amber"   sub={`≤ ${stats.diasAlerta} días`}
          onClick={() => setActivePanel('alerta')} />
        <StatCard icon={Monitor}      label="Sin asignar"       value={stats.libres}        variant="light"   tone="sky"     sub="Pantallas libres"
          onClick={() => setActivePanel('libre')} />
      </div>

      {/* Indicadores financieros y de negocio */}
      <div className="pl-a3 grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <StatCard icon={XCircle}    label="Vencidas"            value={stats.vencidas}                    variant="outline" tone="red"     sub="Requieren acción inmediata"
          onClick={() => setActivePanel('vencido')} />
        <StatCard icon={Wallet}     label="Cuentas que deben"   value={stats.deudores}                    variant="outline" tone="amber"   sub="Pendientes de cobro"
          onClick={() => setActivePanel('debe')} />
        <StatCard icon={Gift}       label="Cortesías activas"   value={stats.cortesias}                   variant="outline" tone="pink"    sub="Sin generar ingreso"
          onClick={() => setActivePanel('cortesia')} />
        <StatCard icon={DollarSign} label="Cartera COP"         value={formatCurrency(stats.montoCartera)} variant="solid"   tone="orange"  sub="Deuda en pesos"
          onClick={() => setActivePanel('debe')} />
        <StatCard icon={DollarSign} label="Cartera USD"         value={`US$${Number(stats.montoCarteraUSD || 0).toLocaleString('en-US')}`} variant="solid" tone="emerald" sub="Deuda en dólares"
          onClick={() => setActivePanel('debe')} />
        <StatCard icon={Percent}    label="Ocupación"           value={`${stats.ocupacion}%`}              variant="light"   tone="cyan"    sub={`${stats.asignadas} de ${stats.total} pantallas`}
          onClick={() => setExplain({
            title: 'Ocupación', value: `${stats.ocupacion}%`, icon: Percent,
            queEs: 'Qué porcentaje de las pantallas registradas en el Planificador están asignadas a un cliente.',
            comoSeCalcula: `**(${stats.asignadas} asignadas ÷ ${stats.total} pantallas) × 100**. El Planificador es la fuente oficial de capacidad: el panel de Ocupación del Dashboard y el de Cuentas Padre usan esta misma base, así todo coincide.`,
            origen: 'Filas del Planificador (asignadas = con nombre o nickname distinto de "libre").',
          })} />
      </div>

      {/* Alertas de Cuentas Padre — visibles cuando hay vencidas o en alerta */}
      {(cpVencidas.length > 0 || cpAlerta.length > 0) && (
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={Building2} label="CP Vencidas" value={cpVencidas.length}
              variant="outline" tone="red" sub="Cuentas padre con servicio vencido"
              onClick={() => { setCpPanelVariante('vencida'); setShowCpPanel(true) }}
            />
            <StatCard
              icon={AlertTriangle} label="CP En Alerta" value={cpAlerta.length}
              variant="outline" tone="amber" sub={`Vencen en ≤ ${DIAS_ALERTA_CP} días`}
              onClick={() => { setCpPanelVariante('alerta'); setShowCpPanel(true) }}
            />
          </div>
          {data?.capacidadPorCuenta?.length > 0 && (
            <button
              onClick={() => setShowCapacidad(p => !p)}
              className="mt-2 flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-700 font-medium transition-colors"
            >
              <ChevronDown size={12} className={cn('transition-transform', showCapacidad && 'rotate-180')} />
              {showCapacidad ? 'Ocultar capacidad por cuenta padre' : 'Ver capacidad por cuenta padre'}
            </button>
          )}
        </div>
      )}

      {/* Widget colapsable de capacidad por cuenta padre */}
      {data?.capacidadPorCuenta?.length > 0 && showCapacidad && (
        <div className="pl-capacity-card mb-4">
          <div className="cap-header flex items-center justify-between px-5 py-3">
            <span className="text-sm font-bold text-purple-700 tracking-wide">Capacidad por cuenta padre</span>
            <button
              onClick={() => setShowCapacidad(false)}
              className="text-purple-400 hover:text-purple-700 p-1 rounded-lg transition-colors"
            >
              <ChevronDown size={15} className="rotate-180" />
            </button>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr className="text-gray-500 bg-gray-50 text-left">
                  <th className="sticky top-0 bg-gray-50 px-3 py-2 font-semibold border-b border-gray-200">ID Cuenta</th>
                  <th className="sticky top-0 bg-gray-50 px-3 py-2 font-semibold border-b border-gray-200">Usuario</th>
                  <th className="sticky top-0 bg-gray-50 px-3 py-2 font-semibold text-center border-b border-gray-200">Cap.</th>
                  <th className="sticky top-0 bg-gray-50 px-3 py-2 font-semibold text-center border-b border-gray-200">Ocup.</th>
                  <th className="sticky top-0 bg-gray-50 px-3 py-2 font-semibold text-center border-b border-gray-200">Libres</th>
                  <th className="sticky top-0 bg-gray-50 px-3 py-2 font-semibold border-b border-gray-200 min-w-[110px]">% Ocupación</th>
                  <th className="sticky top-0 bg-gray-50 px-3 py-2 font-semibold text-center border-b border-gray-200">Estado CP</th>
                </tr>
              </thead>
              <tbody>
                {data.capacidadPorCuenta.map(c => {
                  const pct = c.pctOcupacion
                  const barColor = pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  const cpColor  = c.varianteCp === 'vencida' ? 'text-red-600 font-semibold'
                                 : c.varianteCp === 'alerta'  ? 'text-amber-600 font-semibold'
                                 : 'text-emerald-600'
                  return (
                    <tr key={c.cuentaId} className={`border-b border-gray-50 hover:bg-gray-50 ${c.varianteCp === 'vencida' ? 'bg-red-50' : c.varianteCp === 'alerta' ? 'bg-amber-50' : ''}`}>
                      <td className="px-3 py-2 font-mono font-bold text-brand-accent">{c.cuentaId}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[140px] truncate">{c.nombre || <span className="text-gray-400 italic">—</span>}</td>
                      <td className="px-3 py-2 text-center font-medium">{c.capacidad}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{c.ocupadas}</td>
                      <td className="px-3 py-2 text-center text-emerald-700 font-medium">{c.libres}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                            <div className={`${barColor} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-gray-600 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {c.varianteCp === 'sin_fecha'
                          ? <span className="text-gray-400">Sin fecha</span>
                          : <span className={cpColor}>
                              {c.varianteCp === 'vencida' ? 'Vencida' : c.varianteCp === 'alerta' ? `${c.diasAlFin}d` : `${c.diasAlFin}d`}
                            </span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="pl-glass pl-a3 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, apellido, cuenta, nickname, ID…"
              className="pl-search w-full pl-9 pr-3 py-2.5 text-sm text-gray-800 placeholder-gray-400"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="pl-select px-3 py-2.5 text-sm text-gray-800"
          >
            <option value="ALL">Todos los estados</option>
            <option value="vigente">Vigente</option>
            <option value="alerta">Alerta (próx. vencer)</option>
            <option value="cortesia">Cortesía</option>
            <option value="vencido">Vencido</option>
            <option value="libre">Libre</option>
          </select>
          <span className="text-sm text-purple-400 whitespace-nowrap font-semibold">{rows.length} filas</span>
          <button
            onClick={() => setShowEstatusPanel(p => !p)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
              showEstatusPanel
                ? 'pl-estatus-btn-active'
                : 'border border-purple-200 bg-white/80 text-purple-700 hover:bg-purple-50 hover:border-purple-400'
            )}
          >
            <Users size={14} />
            Estatus Cliente
          </button>
        </div>
      </div>

      {/* Registrar renovación en un paso (venta + plan) — z-[80], sobre el panel */}
      {renovarRow && (
        <RenovarModal
          row={renovarRow}
          onClose={() => setRenovarRow(null)}
          onAbrirPagos={() => { const r = renovarRow; setRenovarRow(null); handleGenerateVenta(r, activePanel || 'vencido') }}
          onRenovado={async () => { setRenovarRow(null); await load(); loadRecordatorios() }}
        />
      )}

      {/* Historial de cambios con deshacer por cambio */}
      {showHistorial && (
        <HistorialPanel onClose={() => setShowHistorial(false)} onCambio={() => { load(); loadRecordatorios() }} />
      )}

      {/* Recordatorios en lote desde Vencidas / Próx. a vencer (z-[80], sobre el panel) */}
      {lote && (
        <RecordatorioLote
          titulo={CATEGORY_CONFIG[lote.catKey]?.title || ''}
          screens={lote.screens}
          recordatorios={recordatorios}
          onClose={() => setLote(null)}
          onRegistrado={loadRecordatorios}
        />
      )}

      {/* Comprobante / recordatorio de renovación (desde Estatus Cliente y desde
          el botón "Status cliente" de Vencidas / Próx. a vencer). z-[80]: queda
          sobre el CategoryPanel (z-50), que permanece abierto debajo. */}
      {comprobanteRow && (
        <ComprobanteModal
          row={comprobanteRow}
          onClose={() => setComprobanteRow(null)}
          onRegistrado={loadRecordatorios}
          ultimoRecordatorio={recordatorios?.ultimos?.[comprobanteRow.idPantalla]}
        />
      )}

      {/* Panel Estatus Cliente — overlay flotante */}
      {showEstatusPanel && (
        <EstatusClientePanel
          rows={rows}
          stats={stats}
          filterStatus={filterStatus}
          passwords={passwords}
          revelar={revelar}
          onClose={() => setShowEstatusPanel(false)}
          onComprobante={(row) => setComprobanteRow(row)}
        />
      )}

      {/* ── Tabla compartida — cualquier cambio en PlanificadorTable.jsx
              se refleja aquí y en SubscriptionsPage automáticamente ── */}
      <Card className="overflow-hidden">
        <PlanificadorTable
          rows={rows}
          stats={stats}
          sortConfig={sortConfig}
          onSort={onSort}
          pwdVisible={pwdVisible}
          passwords={passwords}
          onTogglePwd={togglePwd}
          onEdit={(row) => { setEditRow(row) }}
          onDelete={handleDelete}
        />
      </Card>
    </div>
  )
}
