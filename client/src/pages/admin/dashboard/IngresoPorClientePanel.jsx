import { Fragment, useEffect, useMemo, useState } from 'react'
import { X, UserCheck, Search, FileSpreadsheet, Loader2, ChevronDown, ChevronRight, Receipt } from 'lucide-react'
import ExcelJS from 'exceljs'
import api from '../../../config/api'
import { formatCurrency, formatDate } from '../../../utils/excelUtils'
import { Badge } from '../../../components/ui/Badge'
import { cn } from '../../../utils/cn'

// Variante visual del badge según el tipo de pago de la venta.
function tipoPagoBadgeVariant(tipoPago) {
  const t = (tipoPago || '').toLowerCase()
  if (t.includes('activacion')) return 'orange'
  if (t.includes('renovacion')) return 'info'
  if (t.includes('cortesia')) return 'success'
  return 'neutral'
}

// Colores de marca (ver client/tailwind.config.js) en ARGB para exceljs.
const BRAND = {
  primary: 'FFF97316', // brand.primary (orange-500) — encabezados
  dark:    'FFC2410C', // brand.dark (orange-700) — bordes/acentos
  light:   'FFFED7AA', // brand.light (orange-200) — fila de totales
  accent:  'FF1E293B', // brand.accent (slate-800) — título
  stripe:  'FFFFF7ED', // orange-50 — filas alternas
  border:  'FFE2E8F0', // ui.border
}

// Genera el .xlsx con el listado de ingreso por cliente usando los colores
// corporativos de la app, y dispara su descarga en el navegador.
async function exportIngresoPorClienteExcel(clientes, resumen) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'ChikisdTV'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Ingreso por cliente')
  sheet.columns = [
    { width: 30 }, { width: 16 }, { width: 10 }, { width: 16 }, { width: 12 }, { width: 16 }, { width: 14 },
  ]

  sheet.mergeCells('A1:G1')
  const title = sheet.getCell('A1')
  title.value = 'ChikisdTV · ARPU — Ingreso por cliente'
  title.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
  title.alignment = { vertical: 'middle' }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.accent } }
  sheet.getRow(1).height = 26

  sheet.mergeCells('A2:G2')
  const subtitle = sheet.getCell('A2')
  subtitle.value = `Generado ${new Date().toLocaleDateString('es-CO')} · ${resumen.numClientes} clientes · Ingreso total ${formatCurrency(resumen.totalIngresos)} · ARPU ${formatCurrency(resumen.arpu)}`
  subtitle.font = { name: 'Calibri', size: 10, italic: true, color: { argb: BRAND.dark } }
  subtitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.light } }
  subtitle.alignment = { vertical: 'middle' }
  sheet.getRow(2).height = 20

  sheet.addRow([])

  const headerRow = sheet.addRow(['Cliente', 'ID Cliente', '# Ventas', 'Ingreso total', '% del total', 'Ticket promedio', 'Última compra'])
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.primary } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = { bottom: { style: 'medium', color: { argb: BRAND.dark } } }
  })
  headerRow.height = 22

  clientes.forEach((c, i) => {
    const row = sheet.addRow([
      c.cliente,
      c.customerId,
      c.numVentas,
      c.totalIngresos,
      c.pctTotal / 100,
      c.ticketPromedio,
      c.ultimaCompra ? formatDate(c.ultimaCompra) : '—',
    ])
    const fillColor = i % 2 === 0 ? 'FFFFFFFF' : BRAND.stripe
    row.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } }
      cell.border = { bottom: { style: 'hairline', color: { argb: BRAND.border } } }
      cell.font = { name: 'Calibri', size: 11 }
      if (colNumber === 3) cell.alignment = { horizontal: 'center' }
      if (colNumber === 4 || colNumber === 6) cell.numFmt = '"$" #,##0'
      if (colNumber === 5) cell.numFmt = '0.00%'
    })
  })

  const totalVentas = clientes.reduce((s, c) => s + c.numVentas, 0)
  const totalRow = sheet.addRow(['TOTAL', '', totalVentas, resumen.totalIngresos, 1, resumen.arpu, ''])
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Calibri', bold: true, color: { argb: BRAND.accent } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.light } }
    cell.border = { top: { style: 'medium', color: { argb: BRAND.primary } } }
    if (colNumber === 3) cell.alignment = { horizontal: 'center' }
    if (colNumber === 4 || colNumber === 6) cell.numFmt = '"$" #,##0'
    if (colNumber === 5) cell.numFmt = '0.00%'
  })

  sheet.views = [{ state: 'frozen', ySplit: 4 }]

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ingreso-por-cliente-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

// Panel de detalle del ARPU: lista el ingreso histórico acumulado por cliente
// (a partir de las ventas registradas) y permite exportarlo a Excel con los
// formatos y colores corporativos de la app.
export function IngresoPorClientePanel({ onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [detalles, setDetalles] = useState({})

  useEffect(() => {
    api.get('/admin/dashboard-bi/ingresos-por-cliente')
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || e.message))
  }, [])

  const clientesFiltrados = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    if (!q) return data.clientes
    return data.clientes.filter(c =>
      c.cliente.toLowerCase().includes(q) ||
      c.customerId.toLowerCase().includes(q) ||
      (c.nickname || '').toLowerCase().includes(q)
    )
  }, [data, search])

  const toggleExpand = (customerId) => {
    if (expandedId === customerId) {
      setExpandedId(null)
      return
    }
    setExpandedId(customerId)
    if (!detalles[customerId]) {
      setDetalles(prev => ({ ...prev, [customerId]: { loading: true, error: null, ventas: null } }))
      api.get(`/admin/dashboard-bi/ingresos-por-cliente/${encodeURIComponent(customerId)}`)
        .then(r => setDetalles(prev => ({ ...prev, [customerId]: { loading: false, error: null, ventas: r.data.ventas } })))
        .catch(e => setDetalles(prev => ({ ...prev, [customerId]: { loading: false, error: e.response?.data?.error || e.message, ventas: null } })))
    }
  }

  const handleExport = async () => {
    if (clientesFiltrados.length === 0) return
    setExporting(true)
    try {
      const totalIngresos = clientesFiltrados.reduce((s, c) => s + c.totalIngresos, 0)
      const resumen = {
        numClientes: clientesFiltrados.length,
        totalIngresos,
        arpu: Math.round(totalIngresos / clientesFiltrados.length),
      }
      await exportIngresoPorClienteExcel(clientesFiltrados, resumen)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2.5"><UserCheck size={22} className="text-white" /></div>
            <div>
              <h2 className="text-xl font-bold text-white">ARPU · Ingreso por cliente</h2>
              <p className="text-white/80 text-sm">
                {data ? `${data.numClientes} clientes · ingreso total ${formatCurrency(data.totalIngresos)} · ARPU ${formatCurrency(data.arpu)}` : 'Cargando…'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <X size={20} />
          </button>
        </div>

        {error ? (
          <div className="px-6 py-16 text-center text-red-500">{error}</div>
        ) : !data ? (
          <div className="px-6 py-16 text-center text-gray-400">Cargando ingresos por cliente…</div>
        ) : (
          <>
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="relative max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, nickname o ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-orange-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all text-sm"
                />
              </div>
            </div>

            {clientesFiltrados.length === 0 ? (
              <div className="px-6 py-16 text-center text-gray-400">
                <UserCheck size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No se encontraron clientes para esa búsqueda.</p>
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-2.5 w-6"></th>
                      <th className="px-4 py-2.5">Cliente</th>
                      <th className="px-4 py-2.5 text-center"># Ventas</th>
                      <th className="px-4 py-2.5 text-right">Ingreso total</th>
                      <th className="px-4 py-2.5 text-right">% del total</th>
                      <th className="px-4 py-2.5 text-right">Ticket prom.</th>
                      <th className="px-4 py-2.5">Última compra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesFiltrados.map(c => {
                      const isOpen = expandedId === c.customerId
                      const detalle = detalles[c.customerId]
                      return (
                        <Fragment key={c.customerId}>
                          <tr
                            onClick={() => toggleExpand(c.customerId)}
                            className={cn(
                              'border-b border-gray-100 hover:bg-orange-50/60 transition-colors cursor-pointer',
                              isOpen && 'bg-orange-50/60'
                            )}
                          >
                            <td className="px-4 py-2.5 text-gray-400">
                              {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            </td>
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-gray-800">{c.cliente}</p>
                              <p className="text-xs text-gray-400 font-mono">{c.customerId}</p>
                            </td>
                            <td className="px-4 py-2.5 text-center text-gray-600">{c.numVentas}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-orange-700">{formatCurrency(c.totalIngresos)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-600">{c.pctTotal.toFixed(2)}%</td>
                            <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(c.ticketPromedio)}</td>
                            <td className="px-4 py-2.5 text-gray-600">{c.ultimaCompra ? formatDate(c.ultimaCompra) : '—'}</td>
                          </tr>
                          {isOpen && (
                            <tr className="bg-orange-50/30">
                              <td colSpan={7} className="px-4 py-3 border-b border-orange-100">
                                {detalle?.loading ? (
                                  <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                                    <Loader2 size={14} className="animate-spin" /> Cargando ventas de {c.cliente}…
                                  </div>
                                ) : detalle?.error ? (
                                  <p className="text-sm text-red-500 py-2">{detalle.error}</p>
                                ) : !detalle?.ventas?.length ? (
                                  <p className="text-sm text-gray-400 py-2">Sin ventas registradas para este cliente.</p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                      <Receipt size={13} /> Detalle de ventas — {c.cliente}
                                    </p>
                                    <table className="w-full text-xs bg-white rounded-lg overflow-hidden shadow-sm">
                                      <thead>
                                        <tr className="text-left text-[10px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                                          <th className="px-3 py-2">Fecha</th>
                                          <th className="px-3 py-2">Tipo de pago</th>
                                          <th className="px-3 py-2">Plan</th>
                                          <th className="px-3 py-2">Cuenta / Pantalla</th>
                                          <th className="px-3 py-2">Nickname</th>
                                          <th className="px-3 py-2">Medio de pago</th>
                                          <th className="px-3 py-2 text-right">Valor</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {detalle.ventas.map(v => (
                                          <tr key={v.idVM} className="border-b border-gray-50 last:border-0">
                                            <td className="px-3 py-2 text-gray-600">{v.fecha ? formatDate(v.fecha) : '—'}</td>
                                            <td className="px-3 py-2">
                                              <Badge variant={tipoPagoBadgeVariant(v.tipoPago)}>{v.tipoPago || '—'}</Badge>
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">{v.tipoPlan || '—'}</td>
                                            <td className="px-3 py-2 text-gray-600">{v.cuenta || '—'}</td>
                                            <td className="px-3 py-2 text-gray-600">{v.nickname || '—'}</td>
                                            <td className="px-3 py-2 text-gray-600">{v.medioPago || '—'}</td>
                                            <td className="px-3 py-2 text-right font-semibold text-orange-700">{formatCurrency(v.precioVenta)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            Ordenado por ingreso histórico total · {clientesFiltrados.length} de {data?.numClientes ?? 0} clientes mostrados
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExport}
              disabled={!data || exporting || clientesFiltrados.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-dark text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
              {exporting ? 'Generando…' : 'Exportar a Excel'}
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
