import { cn } from '../../utils/cn'

// Nota móvil: los campos usan text-base (16px) en pantallas pequeñas porque
// iOS hace zoom automático sobre cualquier input con fuente menor a 16px —
// en desktop vuelven al text-sm compacto. La altura mínima de 44px garantiza
// un área táctil cómoda.

export function Input({ className, label, error, ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-brand-accent mb-1">{label}</label>}
      <input
        className={cn(
          'w-full px-3 py-2.5 md:py-2 min-h-[44px] md:min-h-0 text-base md:text-sm rounded-lg border border-ui-border bg-white text-brand-accent placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent',
          error && 'border-state-error focus:ring-state-error',
          className
        )}
        {...props}
      />
      {error && <p className="text-state-error text-xs mt-1">{error}</p>}
    </div>
  )
}

export function Select({ className, label, children, error, ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-brand-accent mb-1">{label}</label>}
      <select
        className={cn(
          'w-full px-3 py-2.5 md:py-2 min-h-[44px] md:min-h-0 text-base md:text-sm rounded-lg border border-ui-border bg-white text-brand-accent',
          'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent',
          error && 'border-state-error',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-state-error text-xs mt-1">{error}</p>}
    </div>
  )
}

export function Textarea({ className, label, error, ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-brand-accent mb-1">{label}</label>}
      <textarea
        className={cn(
          'w-full px-3 py-2.5 md:py-2 text-base md:text-sm rounded-lg border border-ui-border bg-white text-brand-accent',
          'focus:outline-none focus:ring-2 focus:ring-brand-primary',
          className
        )}
        {...props}
      />
      {error && <p className="text-state-error text-xs mt-1">{error}</p>}
    </div>
  )
}
