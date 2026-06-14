import { cn } from '../../utils/cn'

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('bg-ui-surface rounded-xl shadow-card border border-ui-border', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return <div className={cn('p-4 border-b border-ui-border', className)} {...props}>{children}</div>
}

export function CardBody({ className, children, ...props }) {
  return <div className={cn('p-4', className)} {...props}>{children}</div>
}

export function CardTitle({ className, children, ...props }) {
  return <h3 className={cn('text-lg font-semibold text-brand-accent', className)} {...props}>{children}</h3>
}
