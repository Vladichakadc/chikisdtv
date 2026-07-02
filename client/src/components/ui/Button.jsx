import { cn } from '../../utils/cn'

export function Button({ children, variant = 'primary', size = 'md', className, ...props }) {
  const variants = {
    primary: 'bg-brand-primary hover:bg-brand-dark text-white shadow-sm',
    secondary: 'bg-white hover:bg-gray-50 text-brand-accent border border-ui-border',
    danger: 'bg-state-error hover:bg-red-600 text-white',
    ghost: 'hover:bg-gray-100 text-brand-accent'
  }
  // En móvil los botones garantizan el área táctil mínima recomendada (44px)
  // y en desktop conservan su tamaño compacto original.
  const sizes = {
    sm: 'px-3 py-2 md:py-1.5 text-sm min-h-[40px] md:min-h-0',
    md: 'px-4 py-2.5 md:py-2 text-sm min-h-[44px] md:min-h-0',
    lg: 'px-6 py-3 text-base min-h-[48px]'
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        'touch-manipulation select-none active:scale-[0.98]',
        variants[variant], sizes[size], className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
