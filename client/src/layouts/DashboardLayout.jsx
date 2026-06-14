import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Package, FileText, CreditCard, Tv, LogOut, Menu, CalendarClock, UserX, KeyRound, Monitor, GitMerge } from 'lucide-react'
import { useState } from 'react'
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
  { to: '/admin/analisis-dispositivos', label: 'Análisis Dispositivos', icon: Tv },
]

export default function DashboardLayout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    navigate('/login')
  }

  return (
    <div className="h-screen bg-ui-background flex overflow-hidden">
      <aside className={cn('bg-brand-accent text-white flex flex-col flex-shrink-0 transition-all duration-200', open ? 'w-64' : 'w-16')}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {open && (
            <div>
              <div className="text-xl font-bold text-brand-primary">ChikisdTV</div>
              <div className="text-xs text-slate-400">Panel Administrador</div>
            </div>
          )}
          <button onClick={() => setOpen(!open)} className="p-2 hover:bg-slate-700 rounded">
            <Menu size={18} />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1">
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
                <Icon size={18} />
                {open && <span className="font-medium">{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-red-600 hover:text-white border-t border-slate-700 transition-colors"
        >
          <LogOut size={18} />
          {open && <span className="font-medium">Cerrar sesión</span>}
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
