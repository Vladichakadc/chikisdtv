import { useState, useMemo, useEffect } from 'react'
import { useUi } from '../../context/UiContext'
import { Plus, Pencil, Trash2, X, Search, UserX, Tv, ArrowDownCircle, BarChart3, Calendar, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import api from '../../config/api'
import { useApiResource } from '../../hooks/useApiResource'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { formatDate } from '../../utils/excelUtils'
import { todayStr } from '../../utils/dateUtils'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const EMPTY = {
  idBaja: '', customerId: '', nombre: '', apellido: '', sku: '',
  tipoFire: '', devolucion: 'NO', nickname: '', estado: 'Desactivado', cortesia: 'NO',
  pantallas: 1, fechaBaja: '', fecha: '',
  anio: new Date().getFullYear(), mes: MESES[new Date().getMonth()], itemQuantity: 1,
  tipoPlan: '', tipoPantalla: '', cuentaDedicada: '', motivo: '', observaciones: ''
}

const CSS = `
  @keyframes bj-fade-up { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes bj-orb-1   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes bj-orb-2   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  @keyframes bj-drawer-in { from { transform:translateX(100%) } to { transform:translateX(0) } }
  @keyframes bj-fade-in { from { opacity:0 } to { opacity:1 } }
  .bj-a1 { animation: bj-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .bj-a2 { animation: bj-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .bj-orb-1 { animation: bj-orb-1 8s ease-in-out infinite }
  .bj-orb-2 { animation: bj-orb-2 11s ease-in-out infinite }
  .bj-cta {
    background: linear-gradient(135deg, #e11d48, #be123c);
    box-shadow: 0 4px 18px rgba(225,29,72,.4);
    transition: all .22s ease; border: none;
  }
  .bj-cta:hover { box-shadow: 0 7px 24px rgba(225,29,72,.55); transform: translateY(-2px) }
  .bj-overlay { animation: bj-fade-in .2s ease both }
  .bj-drawer { animation: bj-drawer-in .3s cubic-bezier(.22,1,.36,1) both }
  @media (prefers-reduced-motion: reduce) {
    .bj-a1, .bj-a2, .bj-orb-1, .bj-orb-2, .bj-overlay, .bj-drawer { animation: none !important; transition: none !important }
  }
`

function BajaCard({ icon: Icon, label, value, sub, variant, onClick }) {
  const isSolid = variant === 'solid'
  const isOutline = variant === 'outline'
  
  const containerClass = `relative bg-white rounded-2xl overflow-hidden select-none transition-all duration-300
    ${isSolid ? 'shadow-md border border-slate-100' : isOutline ? 'bg-rose-50 border border-rose-200' : 'border border-slate-200 shadow-sm'}
    ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50' : ''}`

  const topBorder = isSolid 
    ? 'linear-gradient(90deg, #f43f5e, #e11d48)'
    : 'linear-gradient(90deg, #fb718580, #f43f5e80)'

  return (
    <div className={containerClass} onClick={onClick}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: topBorder }} />
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[10px] font-bold tracking-[.14em] uppercase mb-1 ${isOutline ? 'text-rose-500' : 'text-slate-400'}`}>
            {label}
          </p>
          <p className="text-3xl font-extrabold text-slate-800 tabular-nums leading-none mt-1">
            {value}
          </p>
          {sub && (
            <p className={`text-xs mt-2 font-medium ${isOutline ? 'text-rose-500' : 'text-slate-500'}`}>
              {sub}
            </p>
          )}
          {onClick && (
            <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors">
              <span>¿Cómo se calcula?</span>
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${isSolid ? 'bg-rose-50 text-rose-500' : 'bg-rose-50 text-rose-500'}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

// Columnas de la tabla
const TABLE_COLUMNS = [
  { key: 'idBaja', label: 'ID Baja' },
  { key: 'customerId', label: 'ID Cliente' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'apellido', label: 'Apellido' },
  { key: 'sku', label: 'SKU' },
  { key: 'tipoFire', label: 'Tipo Fire' },
  { key: 'devolucion', label: 'Devolución' },
  { key: 'nickname', label: 'Nickname' },
  { key: 'estado', label: 'Estado' },
  { key: 'cortesia', label: 'Cortesía' },
  { key: 'pantallas', label: 'Pantallas' },
  { key: 'fechaBaja', label: 'Fecha Baja' },
  { key: 'fecha', label: 'Fecha' },
  { key: 'anio', label: 'Año' },
  { key: 'mes', label: 'Mes' },
  { key: 'itemQuantity', label: 'Cantidad' },
  { key: 'tipoPlan', label: 'Tipo Plan' },
  { key: 'tipoPantalla', label: 'Tipo Pantalla' },
  { key: 'cuentaDedicada', label: 'Cta. Dedicada' },
]

// Icono de orden
function SortIcon({ sortKey, sortCol, sortDir }) {
  if (sortCol !== sortKey) return <ChevronsUpDown size={14} className="opacity-40" />
  return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
}

export default function BajasPage() {
  const { showToast } = useUi()
  const { data: bajas, loading, reload: load } = useApiResource('/admin/bajas')


  const openNew = async () => {
    setEditing(null)
    setForm(EMPTY)
    setNicknameEditMode(false)
    setShowForm(true)
    // Auto-generar ID
    try {
      const { data } = await api.get('/admin/bajas/next-id')
      setForm(f => ({ ...f, idBaja: data.nextId, fechaBaja: todayStr() }))
    } catch (e) { console.error(e) }
    // Cargar nicknames
    try {
      const { data } = await api.get('/admin/bajas/nicknames')
      setNicknames(data)
    } catch (e) { console.error(e) }
  }
  const openEdit = (b) => { setEditing(b); setForm({ ...b }); setNicknameEditMode(false); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setNicknameEditMode(false) }

  const handleNicknameSelect = (nick) => {
    if (!nick) { setForm(f => ({ ...f, nickname: '' })); return }
    const match = nicknames.find(n => n.nickname === nick)
    if (match) {
      setForm(f => ({
        ...f,
        nickname: nick,
        customerId: match.customerId || f.customerId,
        nombre: match.nombre || f.nombre,
        apellido: match.apellido || f.apellido,
        pantallas: match.pantallas || f.pantallas,
        fecha: match.fechaInicio || f.fecha,
        sku: match.sku || f.sku,
        tipoFire: match.tipoFire || f.tipoFire,
        tipoPlan: match.tipoPlan || f.tipoPlan,
        tipoPantalla: match.tipoPantalla || f.tipoPantalla,
        cuentaDedicada: match.cuentaDedicada || f.cuentaDedicada,
        cortesia: match.cortesia || f.cortesia,
        devolucion: match.devolucion || f.devolucion,
      }))
    } else {
      setForm(f => ({ ...f, nickname: nick }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await api.put(`/admin/bajas/${editing.id}`, form)
        showToast('Baja actualizada correctamente.', 'success')
      } else {
        await api.post('/admin/bajas', form)
        showToast('Baja registrada correctamente.', 'success')
      }
      closeForm()
      load()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta baja?')) return
    try {
      await api.delete(`/admin/bajas/${id}`)
      showToast('Baja eliminada correctamente.', 'success')
      load()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const handleSort = (key) => {
    if (sortCol === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(key)
      setSortDir('asc')
    }
  }

  // KPIs
  const stats = useMemo(() => {
    const total = bajas.length
    const devueltos = bajas.filter(b => b.devolucion === 'SI').length
    const cortesias = bajas.filter(b => b.cortesia === 'SI').length
    const meses = {}
    bajas.forEach(b => { if (b.mes) meses[b.mes] = (meses[b.mes] || 0) + 1 })
    const mesMasAlto = Object.entries(meses).sort((a, b) => b[1] - a[1])[0]
    const anioActual = bajas.filter(b => b.anio === 2026).length
    return { total, devueltos, cortesias, mesMasAlto, anioActual }
  }, [bajas])



  const filtered = useMemo(() => {
    let result = bajas
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(b =>
        (b.idBaja || '').toLowerCase().includes(s) ||
        (b.customerId || '').toLowerCase().includes(s) ||
        (b.nombre || '').toLowerCase().includes(s) ||
        (b.apellido || '').toLowerCase().includes(s) ||
        (b.nickname || '').toLowerCase().includes(s) ||
        (b.sku || '').toLowerCase().includes(s)
      )
    }
    // Ordenar
    result = [...result].sort((a, b) => {
      let va = a[sortCol] ?? ''
      let vb = b[sortCol] ?? ''
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va
      }
      va = String(va).toLowerCase()
      vb = String(vb).toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [bajas, search, sortCol, sortDir])

  // Render celda
  const renderCell = (b, col) => {
    switch (col.key) {
      case 'idBaja': return <span className="font-mono text-xs font-bold text-orange-700">{b.idBaja}</span>
      case 'nombre': return <span className="font-medium">{b.nombre}</span>
      case 'sku': return <span className="font-mono text-xs">{b.sku}</span>
      case 'devolucion': return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${b.devolucion === 'SI' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {b.devolucion || '—'}
        </span>
      )
      case 'estado': return (
        <Badge variant={b.estado === 'Desactivado' || b.estado === 'Baja' ? 'danger' : b.estado === 'Activo' ? 'success' : 'warning'}>
          {b.estado}
        </Badge>
      )
      case 'cortesia': return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${b.cortesia === 'SI' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
          {b.cortesia || '—'}
        </span>
      )
      case 'cuentaDedicada': return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${b.cuentaDedicada === 'SI' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
          {b.cuentaDedicada || '—'}
        </span>
      )
      case 'pantallas':
      case 'itemQuantity':
      case 'anio':
      case 'customerId':
        return <span className="text-center block">{b[col.key]}</span>
      case 'fechaBaja':
      case 'fecha':
        return <span className="text-gray-600">{b[col.key] ? formatDate(b[col.key]) : '—'}</span>
      default: return b[col.key] || '—'
    }
  }

  return (
    <div>
      <style>{CSS}</style>

      {/* ── HERO HEADER ── */}
      <div className="bj-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#701a75 0%,#4c0519 100%)' }}>
        <div className="bj-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#f43f5e,transparent 70%)' }} />
        <div className="bj-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.15] pointer-events-none" style={{ background: 'radial-gradient(circle,#be123c,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/25 mb-4">
              <UserX size={12} className="text-rose-300" />
              <span className="text-rose-300 text-xs font-semibold tracking-widest uppercase">Operación Core</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Bajas
            </h1>
            <p className="text-rose-100/70 text-sm mt-2">
              Registro de cancelaciones y bajas de servicio
            </p>
          </div>
          <button onClick={openNew} className="bj-cta px-5 py-2.5 rounded-2xl text-sm font-bold text-white flex items-center gap-2">
            <Plus size={18} /> Nueva Baja
          </button>
        </div>
      </div>

      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <BajaCard icon={UserX} label="Total Bajas" value={stats.total} variant="solid" sub="Histórico completo"
          onClick={() => setExplain({
            title: 'Total Bajas', value: stats.total, icon: UserX,
            queEs: 'Cuántas cancelaciones de servicio se han registrado en toda la historia del negocio — la otra cara del crecimiento.',
            comoSeCalcula: 'Conteo simple de los registros de este módulo. Es la misma cifra que el Dashboard usaba como "bajas históricas".',
            origen: 'Tabla de bajas de este módulo (importada del Excel original y alimentada con cada baja nueva).',
          })} />
        <BajaCard icon={Calendar} label="Bajas 2026" value={stats.anioActual} variant="light" sub="Año en curso"
          onClick={() => setExplain({
            title: 'Bajas 2026', value: stats.anioActual, icon: Calendar,
            queEs: 'Cancelaciones registradas en lo corrido del año actual — el pulso reciente del churn.',
            comoSeCalcula: 'Se cuentan los registros cuyo campo **Año** es el año en curso. Compárala contra el mismo punto del año pasado (no contra el año completo) para saber si el churn mejora o empeora.',
            origen: 'Campo Año de cada registro de este módulo.',
          })} />
        <BajaCard icon={ArrowDownCircle} label="Devueltos" value={stats.devueltos} variant="outline" sub={`${stats.total ? Math.round(stats.devueltos/stats.total*100) : 0}% del total`}
          onClick={() => setExplain({
            title: 'Devueltos', value: stats.devueltos, icon: ArrowDownCircle,
            queEs: 'De las bajas registradas, cuántas devolvieron el equipo físico. Recuperar el equipo permite revenderlo y recuperar parte del costo.',
            comoSeCalcula: 'Se cuentan los registros con el campo **Devolución = SÍ**.',
            origen: 'Campo Devolución de cada baja de este módulo.',
          })} />
        <BajaCard icon={Tv} label="Cortesías" value={stats.cortesias} variant="light" sub="Servicio gratuito"
          onClick={() => setExplain({
            title: 'Cortesías', value: stats.cortesias, icon: Tv,
            queEs: 'Bajas de clientes que tenían el servicio de cortesía (gratis) — su cancelación no afecta el ingreso, pero libera capacidad.',
            comoSeCalcula: 'Se cuentan los registros con el campo **Cortesía = SÍ**.',
            origen: 'Campo Cortesía de cada baja de este módulo.',
          })} />
        <BajaCard icon={BarChart3} label="Mes pico" value={stats.mesMasAlto ? stats.mesMasAlto[0] : '—'} variant="solid" sub={stats.mesMasAlto ? `${stats.mesMasAlto[1]} bajas` : ''}
          onClick={() => setExplain({
            title: 'Mes pico', value: stats.mesMasAlto ? `${stats.mesMasAlto[0]} (${stats.mesMasAlto[1]} bajas)` : '—', icon: BarChart3,
            queEs: 'El mes del calendario con más cancelaciones acumuladas en el histórico — señala la estacionalidad del churn.',
            comoSeCalcula: 'Se agrupan todas las bajas por su campo **Mes** (sumando todos los años) y se toma el mes con mayor conteo. Útil para anticipar campañas de retención antes de ese mes.',
            origen: 'Campo Mes de cada baja de este módulo.',
          })} />
      </div>



      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ID, nombre, nickname, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-orange-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-lg border-orange-100 overflow-hidden">
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3"></div>
              <p className="text-gray-500">Cargando bajas...</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-gray-400">No se encontraron registros</p>
          ) : (
            <div className="overflow-auto max-h-[34rem] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-200 hover:[&::-webkit-scrollbar-thumb]:bg-orange-300">
              <table className="w-full text-base border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-white">
                    {TABLE_COLUMNS.map(col => (
                      <th
                        key={col.key}
                        scope="col"
                        onClick={() => handleSort(col.key)}
                        className="sticky top-0 z-10 bg-orange-600 px-3 py-3 font-semibold whitespace-nowrap cursor-pointer hover:bg-orange-700 transition-colors select-none shadow-[0_1px_0_0_rgba(0,0,0,0.08)]"
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          <SortIcon sortKey={col.key} sortCol={sortCol} sortDir={sortDir} />
                        </div>
                      </th>
                    ))}
                    <th className="sticky top-0 right-0 z-20 bg-orange-600 px-3 py-3 font-semibold whitespace-nowrap text-center shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b, i) => (
                    <tr key={b.id} className={`border-b border-orange-50 hover:bg-orange-50/70 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}`}>
                      {TABLE_COLUMNS.map(col => (
                        <td key={col.key} className="px-3 py-2.5 whitespace-nowrap">{renderCell(b, col)}</td>
                      ))}
                      <td className="px-3 py-2.5 whitespace-nowrap text-center sticky right-0 z-10 bg-white shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => openEdit(b)} className="text-orange-600 hover:bg-orange-100 p-2 rounded-lg transition-colors"><Pencil size={20} /></button>
                          <button onClick={() => handleDelete(b.id)} className="text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors"><Trash2 size={20} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
        <div className="flex items-center justify-between border-t border-orange-100 bg-orange-50/40 px-4 py-2 text-xs text-gray-500">
          <span>{filtered.length} de {bajas.length} registros</span>
          <span>Ordenado por <strong className="text-brand-accent">{TABLE_COLUMNS.find(c => c.key === sortCol)?.label}</strong> ({sortDir === 'asc' ? '↑ ascendente' : '↓ descendente'})</span>
        </div>
      </Card>

      {/* Form Drawer (PRO MAX Drawer) */}
      {showForm && (
        <>
          <div className="bj-overlay fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={closeForm} />
          <div className="bj-drawer fixed inset-y-0 right-0 z-50 w-full md:w-[600px] bg-white shadow-2xl flex flex-col border-l border-slate-100">
            {/* Header del Drawer */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{editing ? 'Editar Baja' : 'Nueva Baja'}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {editing ? 'Modifica los datos del registro' : 'Registra una nueva cancelación'}
                </p>
              </div>
              <button onClick={closeForm} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo del Formulario */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 text-sm font-semibold text-rose-700 border-b border-rose-100 pb-1 flex items-center gap-2">
                    <span>📋 Identificación</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID Baja (Auto)</label>
                    <input value={form.idBaja || 'Generando...'} readOnly disabled className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 font-mono font-bold cursor-not-allowed" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Nickname *</label>
                      {editing && (
                        <button
                          type="button"
                          onClick={() => setNicknameEditMode(m => !m)}
                          className="text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1"
                          title={nicknameEditMode ? 'Volver a la lista de cuentas activas' : 'Editar nickname manualmente'}
                        >
                          <Pencil size={12} /> {nicknameEditMode ? 'Usar lista' : 'Editar nickname'}
                        </button>
                      )}
                    </div>
                    {nicknameEditMode ? (
                      <input
                        value={form.nickname || ''}
                        onChange={(e) => setForm(f => ({ ...f, nickname: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none"
                        required
                      />
                    ) : (
                      <>
                        <select
                          value={form.nickname || ''}
                          onChange={(e) => handleNicknameSelect(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none"
                          required
                        >
                          <option value="">-- Seleccionar nickname --</option>
                          {form.nickname && !nicknames.some(n => n.nickname === form.nickname) && (
                            <option value={form.nickname}>{form.nickname}</option>
                          )}
                          {nicknames.map(n => (
                            <option key={n.nickname} value={n.nickname}>
                              {n.nickname}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">Al seleccionar se llenan los campos asociados</p>
                      </>
                    )}
                  </div>
                  <Input label="ID Cliente" value={form.customerId || ''} onChange={(e) => setForm({ ...form, customerId: e.target.value })} />
                  <Input label="Nombre *" value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                  <Input label="Apellido" value={form.apellido || ''} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 text-sm font-semibold text-rose-700 border-b border-rose-100 pb-1 flex items-center gap-2">
                    <span>📺 Dispositivo</span>
                  </div>
                  <Input label="SKU" value={form.sku || ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                  <Input label="Tipo Fire TV" value={form.tipoFire || ''} onChange={(e) => setForm({ ...form, tipoFire: e.target.value })} />
                  <Select label="Devolución" value={form.devolucion || ''} onChange={(e) => setForm({ ...form, devolucion: e.target.value })}>
                    <option value="">--</option>
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 text-sm font-semibold text-rose-700 border-b border-rose-100 pb-1 flex items-center gap-2">
                    <span>⚙️ Estado y Plan</span>
                  </div>
                  <Select label="Estado" value={form.estado || 'Desactivado'} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                    <option value="Desactivado">Desactivado</option>
                    <option value="Baja">Baja</option>
                    <option value="Activo">Activo</option>
                    <option value="Cortesía">Cortesía</option>
                  </Select>
                  <Select label="Cortesía" value={form.cortesia || ''} onChange={(e) => setForm({ ...form, cortesia: e.target.value })}>
                    <option value="">--</option>
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </Select>
                  <Input label="Pantallas" type="number" value={form.pantallas || 1} onChange={(e) => setForm({ ...form, pantallas: e.target.value })} min="1" />
                  <Input label="Cantidad" type="number" value={form.itemQuantity || 1} onChange={(e) => setForm({ ...form, itemQuantity: e.target.value })} min="1" />
                  <Input label="Tipo de Plan" value={form.tipoPlan || ''} onChange={(e) => setForm({ ...form, tipoPlan: e.target.value })} placeholder="Plan Mensual, Semestral..." />
                  <Input label="Tipo Pantalla" value={form.tipoPantalla || ''} onChange={(e) => setForm({ ...form, tipoPantalla: e.target.value })} placeholder="Individual, Revendedor..." />
                  <Select label="Cuenta Dedicada" value={form.cuentaDedicada || ''} onChange={(e) => setForm({ ...form, cuentaDedicada: e.target.value })}>
                    <option value="">--</option>
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 text-sm font-semibold text-rose-700 border-b border-rose-100 pb-1 flex items-center gap-2">
                    <span>📅 Fechas</span>
                  </div>
                  <Input label="Fecha de Baja" type="date" value={form.fechaBaja || ''} onChange={(e) => setForm({ ...form, fechaBaja: e.target.value })} />
                  <Input label="Fecha Inicial" type="date" value={form.fecha || ''} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                  <Input label="Año" type="number" value={form.anio || ''} onChange={(e) => setForm({ ...form, anio: e.target.value })} />
                  <Select label="Mes" value={form.mes || ''} onChange={(e) => setForm({ ...form, mes: e.target.value })}>
                    <option value="">-- Seleccionar mes --</option>
                    <option value="Enero">Enero</option>
                    <option value="Febrero">Febrero</option>
                    <option value="Marzo">Marzo</option>
                    <option value="Abril">Abril</option>
                    <option value="Mayo">Mayo</option>
                    <option value="Junio">Junio</option>
                    <option value="Julio">Julio</option>
                    <option value="Agosto">Agosto</option>
                    <option value="Septiembre">Septiembre</option>
                    <option value="Octubre">Octubre</option>
                    <option value="Noviembre">Noviembre</option>
                    <option value="Diciembre">Diciembre</option>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 text-sm font-semibold text-rose-700 border-b border-rose-100 pb-1 flex items-center gap-2">
                    <span>📝 Notas</span>
                  </div>
                  <div className="sm:col-span-2">
                    <Select label="Motivo de la baja" value={form.motivo || ''} onChange={(e) => setForm({ ...form, motivo: e.target.value })}>
                      <option value="">-- Seleccionar motivo --</option>
                      <option value="Precio elevado">Precio elevado / No puede pagar</option>
                      <option value="Problemas de señal">Problemas de señal / Buffering</option>
                      <option value="Cambio de proveedor">Cambio a otro proveedor IPTV</option>
                      <option value="No usa el servicio">No usa el servicio / Poco interés</option>
                      <option value="Problemas con el dispositivo">Problemas con el dispositivo Fire TV</option>
                      <option value="Mala calidad de contenido">Mala calidad de contenido / Canales caídos</option>
                      <option value="Viaje o mudanza">Viaje, mudanza o cambio de residencia</option>
                      <option value="Problemas económicos">Problemas económicos del cliente</option>
                      <option value="Insatisfacción con el soporte">Insatisfacción con el soporte técnico</option>
                      <option value="Prefiere streaming legal">Prefiere plataformas de streaming legales</option>
                      <option value="Dispositivo dañado o perdido">Dispositivo dañado o perdido</option>
                      <option value="Problemas de compatibilidad">Problemas de compatibilidad con su TV/Internet</option>
                      <option value="Cliente moroso">Cliente moroso / No paga a tiempo</option>
                      <option value="Cancelación temporal">Cancelación temporal (planea volver)</option>
                      <option value="Fallecimiento">Fallecimiento del titular</option>
                      <option value="Otro">Otro motivo</option>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Textarea label="Observaciones" rows={2} value={form.observaciones || ''} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} placeholder="Detalles adicionales..." />
                  </div>
                </div>

              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
                <Button type="button" variant="secondary" onClick={closeForm}>Cancelar</Button>
                <button type="submit" className="bj-cta px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md hover:shadow-lg">
                  {editing ? 'Actualizar Baja' : 'Registrar Baja'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
