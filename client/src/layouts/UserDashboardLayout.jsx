import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, FileText, CreditCard, Tv, LogOut, Menu } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../utils/cn'

const navItems = [
  { to: '/dashboard', label: 'Mi Resumen', icon: Home, end: true },
  { to: '/dashboard/subscription', label: 'Mi Suscripción', icon: FileText },
  { to: '/dashboard/payments', label: 'Mis Pagos', icon: CreditCard },
  { to: '/dashboard/devices', label: 'Mis Dispositivos', icon: Tv }
]

export default function UserDashboardLayout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-ui-background flex">
      <aside className={cn('bg-brand-accent text-white flex flex-col transition-all duration-200', open ? 'w-64' : 'w-16')}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {open && (
            <div>
              <div className="text-xl font-bold text-brand-primary">ChikisdTV</div>
              <div className="text-xs text-slate-400">Mi Portal</div>
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

      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
