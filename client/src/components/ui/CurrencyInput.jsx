import { useState, useEffect } from 'react'
import { cn } from '../../utils/cn'

// Conserva solo dígitos y, si se permiten decimales, un único separador decimal
function sanitize(raw, decimals) {
  let s = raw.replace(/[^\d.,]/g, '')
  if (decimals > 0) {
    s = s.replace(/,/g, '.')
    const i = s.indexOf('.')
    if (i !== -1) {
      s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, decimals)
    }
  } else {
    s = s.replace(/[.,]/g, '')
  }
  return s
}

const group = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

function display(raw, decimals) {
  if (!raw) return ''
  const dot = raw.indexOf('.')
  if (decimals > 0 && dot !== -1) {
    return `${group(raw.slice(0, dot))},${raw.slice(dot + 1)}`
  }
  return group(raw)
}

// Input que formatea el valor como moneda mientras se escribe (p. ej. $1.234.567)
// onChange recibe un evento sintético { target: { value } } con el número crudo,
// para ser un reemplazo directo de <input type="number">
export function CurrencyInput({ label, error, value, onChange, decimals = 0, prefix = '$', className, ...props }) {
  const [raw, setRaw] = useState('')

  useEffect(() => {
    if (value === '' || value == null) { setRaw(''); return }
    setRaw(String(value).replace(',', '.'))
  }, [value])

  const handleChange = (e) => {
    const next = sanitize(e.target.value, decimals)
    setRaw(next)
    onChange({ target: { value: next } })
  }

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-brand-accent mb-1">{label}</label>}
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none select-none">{prefix}</span>}
        <input
          type="text"
          inputMode="decimal"
          value={display(raw, decimals)}
          onChange={handleChange}
          className={cn(
            'w-full py-2 pr-3 rounded-lg border border-ui-border bg-white text-brand-accent placeholder:text-gray-400',
            prefix ? 'pl-7' : 'pl-3',
            'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent',
            error && 'border-state-error focus:ring-state-error',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-state-error text-xs mt-1">{error}</p>}
    </div>
  )
}
