import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '../../utils/cn'

export function DataTable({ columns, data, emptyMessage = 'Sin datos para mostrar', defaultSortKey = null, defaultSortDir = 'asc', maxHeight = '34rem' }) {
  const [sortKey, setSortKey] = useState(defaultSortKey)
  const [sortDir, setSortDir] = useState(defaultSortDir)

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortKey(null); setSortDir('asc') }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey || !data) return data
    const col = columns.find(c => c.key === sortKey)
    return [...data].sort((a, b) => {
      const aVal = col?.sortValue ? col.sortValue(a) : a[sortKey]
      const bVal = col?.sortValue ? col.sortValue(b) : b[sortKey]
      if (aVal == null || typeof aVal === 'object') return 1
      if (bVal == null || typeof bVal === 'object') return -1
      const cmp = typeof aVal === 'string'
        ? aVal.localeCompare(bVal, 'es', { sensitivity: 'base' })
        : Number(aVal) - Number(bVal)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir, columns])

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
        <p className="text-sm font-medium text-gray-500">{emptyMessage}</p>
        <p className="text-xs text-gray-400">Los registros aparecerán aquí cuando existan</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div
        className="overflow-auto rounded-b-xl [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ui-border hover:[&::-webkit-scrollbar-thumb]:bg-brand-light"
        style={{ maxHeight }}
      >
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {columns.map((col) => {
                const noSort = col.key === 'actions' || col.sortable === false
                const isActive = sortKey === col.key
                return (
                  <th
                    key={col.key}
                    scope="col"
                    onClick={noSort ? undefined : () => handleSort(col.key)}
                    className={cn(
                      'sticky top-0 z-10 whitespace-nowrap border-b border-ui-border bg-slate-50/95 px-2 py-2 md:px-4 md:py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-accent shadow-[0_1px_0_0_theme(colors.ui.border)] backdrop-blur-sm',
                      !noSort && 'cursor-pointer select-none hover:bg-slate-100',
                      isActive && 'text-brand-dark',
                      col.className
                    )}
                  >
                    {noSort ? col.label : (
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        {isActive
                          ? sortDir === 'asc'
                            ? <ChevronUp size={12} className="text-brand-primary flex-shrink-0" />
                            : <ChevronDown size={12} className="text-brand-primary flex-shrink-0" />
                          : <ChevronsUpDown size={12} className="text-gray-300 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />}
                      </div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => (
              <tr
                key={row.id ?? idx}
                className={cn(
                  'group transition-colors hover:bg-orange-50/70',
                  idx % 2 === 1 && 'bg-ui-background/60'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('border-b border-ui-border/70 px-2 py-2 md:px-4 md:py-3 text-sm text-brand-accent', col.cellClassName)}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between rounded-b-xl border-t border-ui-border bg-ui-background/50 px-4 py-2 text-xs text-gray-400">
        <span>{sorted.length} registro{sorted.length === 1 ? '' : 's'}</span>
        <span className="sm:hidden">← Desliza para ver más</span>
        <span className="hidden sm:inline">Haz clic en un encabezado para ordenar</span>
      </div>
    </div>
  )
}
