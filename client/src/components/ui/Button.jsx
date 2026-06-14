import { cn } from '../../utils/cn'

export function Button({ children, variant = 'primary', size = 'md', className, ...props }) {
  const variants = {
    primary: 'bg-brand-primary hover:bg-brand-dark text-white shadow-sm',
    secondary: 'bg-white hover:bg-gray-50 text-brand-accent border border-ui-border',
    danger: 'bg-state-error hover:bg-red-600 text-white',
    ghost: 'hover:bg-gray-100 text-brand-accent'
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant], sizes[size], className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
