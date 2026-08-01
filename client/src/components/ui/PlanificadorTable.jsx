/**
 * PlanificadorTable — Shared component
 *
 * La tabla exacta del Planificador extraída como componente reutilizable.
 * Tanto PlanificadorPage como SubscriptionsPage la usan; cualquier cambio
 * aquí se refleja automáticamente en ambas páginas.
 *
 * Props:
 *  rows        — array de filas ya filtradas/ordenadas listo para renderizar
 *  stats       — { diasAlerta } para calcular colores de fila
 *  sortConfig  — { key, dir }
 *  onSort      — (key) => void
 *  hidePwd     — { [cuentaId]: bool }
 *  onTogglePwd — (cuentaId) => void
 *  onEdit      — (row) => void
 *  onDelete    — (row) => void
 *  readOnly    — si true, oculta columna de acciones (default false)
 */

import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'
import { Badge } from './Badge'
import { SortTh, DaysChip, MonthsChip } from '../../pages/admin/planificador/TableBits'
import {
  calcDias, getRowVariant, ROW_BG, estadoBadgeVariant,
} from '../../pages/admin/planificador/rowHelpers'
import { formatDate, formatCurrency } from '../../utils/excelUtils'

export function PlanificadorTable({
  rows = [],
  stats = {},
  sortConfig,
  onSort,
  hidePwd = {},
  onTogglePwd,
  onEdit,
  onDelete,
  readOnly = false,
}) {
  const diasAlerta = stats.diasAlerta ?? 7

  return (
    <div
      className="overflow-auto max-h-[38rem] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5
                 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full
                 [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300"
    >
      <table className="w-full text-sm border-collapse">
        {/* ── Column group headers (CUENTA / CLIENTE / PLAN) ── */}
        <thead className="sticky top-0 z-20 shadow-[0_2px_4px_-2px_rgba(0,0,0,0.2)]">
          <tr className="text-center text-white text-xs font-bold">
            {!readOnly && (
              <th colSpan={9} className="py-1.5 bg-blue-700 border-r-2 border-blue-500 tracking-wider">
                CUENTA
              </th>
            )}
            <th colSpan={5} className="py-1.5 bg-emerald-700 border-r-2 border-emerald-500 tracking-wider">
              CLIENTE
            </th>
            <th colSpan={8} className="py-1.5 bg-purple-700 tracking-wider">
              PLAN
            </th>
            {!readOnly && (
              <th rowSpan={2} className="px-2 py-2 bg-gray-700 w-20 sticky right-0 z-10" />
            )}
          </tr>
          <tr className="bg-gray-100 text-gray-600 text-left border-b-2 border-gray-300">
            {!readOnly && (
              <>
                <SortTh colKey="cuentaId"    label="ID"         sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="cuenta"      label="Cuenta"     sortConfig={sortConfig} onSort={onSort} />
                <th className="px-2 py-2 font-semibold whitespace-nowrap">Contraseña</th>
                <SortTh colKey="credito"     label="Crédito"    sortConfig={sortConfig} onSort={onSort} className="text-right" />
                <SortTh colKey="inicio"      label="Inicio"     sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="finalizacion" label="Fin"       sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="dias"        label="Días"       sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="estado"      label="Estado"     sortConfig={sortConfig} onSort={onSort} />
                <SortTh colKey="alerta"      label="Alerta"     sortConfig={sortConfig} onSort={onSort} className="border-r-2 border-gray-300" />
              </>
            )}
            <SortTh colKey="nombre"      label="Nombre"     sortConfig={sortConfig} onSort={onSort} />
            <SortTh colKey="apellido"    label="Apellido"   sortConfig={sortConfig} onSort={onSort} />
            <SortTh colKey="idPantalla"  label="Pantalla"   sortConfig={sortConfig} onSort={onSort} />
            <SortTh colKey="customerId"  label="Customer ID" sortConfig={sortConfig} onSort={onSort} />
            <SortTh colKey="nickname"    label="Nickname"   sortConfig={sortConfig} onSort={onSort} className="border-r-2 border-gray-300" />
            <SortTh colKey="pantallas"   label="#"          sortConfig={sortConfig} onSort={onSort} className="text-center" />
            <SortTh colKey="duracionPlan" label="Duración"  sortConfig={sortConfig} onSort={onSort} className="text-center" />
            <SortTh colKey="tipoPlan"    label="Tipo Plan"  sortConfig={sortConfig} onSort={onSort} />
            <SortTh colKey="inicioReal"  label="Ini. Real"  sortConfig={sortConfig} onSort={onSort} />
            <SortTh colKey="duracionReal" label="Fin Real"  sortConfig={sortConfig} onSort={onSort} />
            <SortTh colKey="diasReal"    label="Mes R."     sortConfig={sortConfig} onSort={onSort} />
            <SortTh colKey="estadoReal"  label="Estado R."  sortConfig={sortConfig} onSort={onSort} />
            <SortTh colKey="alertaReal"  label="Alerta R."  sortConfig={sortConfig} onSort={onSort} />
            <SortTh colKey="debe"        label="Debe"       sortConfig={sortConfig} onSort={onSort} className="text-center" />
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {rows.map((row, i) => {
            const rv        = getRowVariant(row, diasAlerta)
            const rowBg     = ROW_BG[rv]
            const borderTop = row.isGroupStart
              ? 'border-t-2 border-gray-300'
              : 'border-t border-gray-100'

            const tipoPlanLabel = (() => {
              if (row.tipoPlan) return <Badge variant="orange">{row.tipoPlan}</Badge>
              const d = row.duracionPlan != null ? Math.floor(Number(row.duracionPlan)) : null
              if (d === 14) return <Badge variant="success">Plan Anual</Badge>
              if (d === 7)  return <Badge variant="warning">Plan Semestral</Badge>
              if (d === 1)  return <Badge variant="neutral">Plan Mensual</Badge>
              return d != null ? <Badge variant="error">REVISAR</Badge> : <span className="text-gray-300">—</span>
            })()

            return (
              <tr
                key={`plt-${row.idPantalla}-${i}`}
                className={`${rowBg} ${borderTop} transition-colors`}
              >
                {/* CUENTA */}
                {!readOnly && (
                  <>
                    <td className="px-2 py-1.5 font-bold text-brand-accent whitespace-nowrap">{row.cuentaId}</td>
                    <td className="px-2 py-1.5 font-mono text-gray-900 whitespace-nowrap">{row.cuenta}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        {!hidePwd[row.cuentaId]
                          ? <span className="font-mono text-gray-700">{row.password}</span>
                          : <span className="text-gray-300 tracking-widest">••••••</span>}
                        {onTogglePwd && (
                          <button
                            onClick={() => onTogglePwd(row.cuentaId)}
                            className="text-gray-300 hover:text-gray-600 flex-shrink-0"
                          >
                            {!hidePwd[row.cuentaId] ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-gray-900 text-right whitespace-nowrap">{row.credito ?? '—'}</td>
                    <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">{row.inicio ? formatDate(row.inicio) : '—'}</td>
                    <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">{row.finalizacion ? formatDate(row.finalizacion) : '—'}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <DaysChip dias={calcDias(row.finalizacion) ?? row.diasVencimiento} />
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {row.estado
                        ? <Badge variant={estadoBadgeVariant(row.estado)}>{row.estado}</Badge>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap border-r-2 border-gray-200">
                      {row.alerta
                        ? <Badge variant={estadoBadgeVariant(row.alerta)}>{row.alerta}</Badge>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </>
                )}

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
                <td className="px-2 py-1.5 whitespace-nowrap">{tipoPlanLabel}</td>
                <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">{row.inicioReal ? formatDate(row.inicioReal) : '—'}</td>
                <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">{row.duracionReal ? formatDate(row.duracionReal) : '—'}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <MonthsChip dias={calcDias(row.duracionReal) ?? row.diasVencimientoReal} />
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {row.estadoReal
                    ? <Badge variant={estadoBadgeVariant(row.estadoReal)}>{row.estadoReal}</Badge>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {row.alertaReal
                    ? <Badge variant={estadoBadgeVariant(row.alertaReal)}>{row.alertaReal}</Badge>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-2 py-1.5 text-center whitespace-nowrap">
                  {row.debe
                    ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <Badge variant="error">Debe</Badge>
                        {row.montoDebe > 0 && (
                          <span className="text-xs font-semibold text-red-600">{formatCurrency(row.montoDebe)}</span>
                        )}
                        {row.montoDebeUSD > 0 && (
                          <span className="text-xs font-semibold text-emerald-700">US${Number(row.montoDebeUSD).toLocaleString('en-US')}</span>
                        )}
                      </div>
                    )
                    : <span className="text-gray-300">—</span>}
                </td>

                {/* ACCIONES */}
                {!readOnly && (
                  <td className="px-2 py-1.5 text-center sticky right-0 bg-white z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center justify-center gap-1">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="p-1.5 rounded text-brand-primary hover:bg-brand-primary hover:text-white transition-colors"
                          title="Editar"
                          data-testid={`plan-edit-${row.idPantalla}`}
                        >
                          <Pencil size={18} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row)}
                          className="p-1.5 rounded text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                          title="Eliminar"
                          data-testid={`plan-delete-${row.idPantalla}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )
          })}

          {rows.length === 0 && (
            <tr>
              <td
                colSpan={readOnly ? 22 : 23}
                className="px-4 py-12 text-center text-gray-400"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-gray-300">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8M12 17v4" />
                    </svg>
                  </div>
                  <p className="text-sm">No se encontraron pantallas con los filtros aplicados.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
