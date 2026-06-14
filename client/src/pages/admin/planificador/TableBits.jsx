import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '../../../utils/cn'

export function SortTh({ colKey, label, sortConfig, onSort, className }) {
  const isActive = sortConfig.key === colKey
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn('px-2 py-2 font-semibold whitespace-nowrap cursor-pointer select-none hover:bg-gray-200 group', className)}
    >
      <div className="flex items-center gap-0.5">
        {label}
        {isActive
          ? sortConfig.dir === 'asc'
            ? <ChevronUp size={10} className="text-brand-primary flex-shrink-0" />
            : <ChevronDown size={10} className="text-brand-primary flex-shrink-0" />
          : <ChevronsUpDown size={10} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0" />}
      </div>
    </th>
  )
}

export function DaysChip({ dias }) {
  if (dias == null) return <span className="text-gray-400">—</span>
  const cls = dias <= 0 ? 'text-red-600 font-bold' : dias <= 8 ? 'text-amber-600 font-semibold' : 'text-green-700'
  return <span className={cls}>{dias}d</span>
}
