import { createContext, useContext, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '../utils/cn'

const UiContext = createContext(null)

// Look corporativo: tarjeta blanca con barra de acento en los colores de marca/estado,
// icono según el resultado y tipografía en brand-accent — consistente en toda la app.
const TOAST_STYLES = {
  success: { border: 'border-state-success', icon: CheckCircle2, iconClass: 'text-state-success' },
  error:   { border: 'border-state-error',   icon: XCircle,      iconClass: 'text-state-error' },
  warning: { border: 'border-state-warning', icon: AlertTriangle, iconClass: 'text-state-warning' },
  info:    { border: 'border-brand-primary', icon: Info,         iconClass: 'text-brand-primary' },
}

export function UiProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const style = toast ? (TOAST_STYLES[toast.type] || TOAST_STYLES.info) : null
  const ToastIcon = style?.icon

  return (
    <UiContext.Provider value={{ sidebarOpen, setSidebarOpen, toast, showToast }}>
      {children}
      {toast && (
        <div
          className={cn(
            'fixed top-4 right-4 z-[9999] flex items-start gap-3 w-full max-w-sm rounded-xl border-l-4 bg-white px-4 py-3 shadow-card-hover',
            style.border
          )}
          role="alert"
        >
          <ToastIcon size={20} className={cn('shrink-0 mt-0.5', style.iconClass)} />
          <p className="text-sm font-medium text-brand-accent leading-snug">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="ml-auto shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </UiContext.Provider>
  )
}

export const useUi = () => useContext(UiContext)
