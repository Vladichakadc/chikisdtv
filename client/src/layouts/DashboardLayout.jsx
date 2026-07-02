import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Package, FileText, CreditCard, Tv, LogOut, Menu, CalendarClock, UserX, KeyRound, Monitor, GitMerge, X, Landmark } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '../utils/cn'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/planificador', label: 'Planificador', icon: CalendarClock },
  { to: '/admin/clients', label: 'Clientes', icon: Users },
  { to: '/admin/plans', label: 'Planes', icon: Package },
  { to: '/admin/subscriptions', label: 'Suscripciones', icon: FileText },
  { to: '/admin/payments', label: 'Pagos', icon: CreditCard },
  { to: '/admin/costo-pantalla', label: 'Costo Pantalla', icon: Monitor },
  { to: '/admin/ventas-dispositivos', label: 'Venta Dispositivos', icon: Tv },
  { to: '/admin/devices', label: 'Inventario Equipos', icon: Tv },
  { to: '/admin/bajas', label: 'Bajas', icon: UserX },
  { to: '/admin/cuentas-padre', label: 'Cuentas Padre', icon: KeyRound },
  { to: '/admin/retencion', label: 'Análisis Retención', icon: GitMerge },
  { to: '/admin/analisis-financiero', label: 'Análisis Financiero', icon: Landmark },
  { to: '/admin/analisis-dispositivos', label: 'Análisis Dispositivos', icon: Tv },
]

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Cierra el drawer móvil al cambiar de ruta
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    navigate('/login')
  }

  const showLabels = open || mobileOpen

  return (
    <div className="h-screen bg-ui-background flex overflow-hidden">

      {/* Overlay oscuro detrás del drawer en mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-brand-accent text-white flex flex-col transition-all duration-300 z-50',
          // Mobile: drawer fijo fuera de pantalla por defecto
          'fixed inset-y-0 left-0 w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: sidebar estático en flujo normal, sin translate
          'md:relative md:translate-x-0 md:inset-y-auto md:left-auto md:flex-shrink-0',
          open ? 'md:w-64' : 'md:w-16',
        )}
      >
        {/* Cabecera del sidebar */}
        <div
          className={cn(
            'p-4 border-b border-slate-700 flex items-center flex-shrink-0',
            showLabels ? 'justify-between' : 'justify-center'
          )}
        >
          {showLabels && (
            <div>
              <div className="text-xl font-bold text-brand-primary">ChikisdTV</div>
              <div className="text-xs text-slate-400">Panel Administrador</div>
            </div>
          )}
          {/* Botón colapsar — solo desktop */}
          <button
            onClick={() => setOpen(!open)}
            className="p-2 hover:bg-slate-700 rounded hidden md:block"
            aria-label="Colapsar menú"
          >
            <Menu size={18} />
          </button>
          {/* Botón cerrar drawer — solo mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 hover:bg-slate-700 rounded md:hidden"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-2.5 transition-colors',
                    isActive
                      ? 'bg-brand-primary text-white border-l-4 border-white'
                      : 'text-slate-300 hover:bg-slate-700 border-l-4 border-transparent'
                  )
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                {showLabels && <span className="font-medium">{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-red-600 hover:text-white border-t border-slate-700 transition-colors flex-shrink-0"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {showLabels && <span className="font-medium">Cerrar sesión</span>}
        </button>
      </aside>

      {/* Área de contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header sticky — solo visible en mobile */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-brand-accent text-white border-b border-slate-700 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <span className="text-base font-bold text-brand-primary">ChikisdTV</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-3 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
