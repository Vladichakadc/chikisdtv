import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, FileText, CreditCard, Tv, LogOut, Menu,
  CalendarClock, UserX, KeyRound, Monitor, GitMerge, X, Landmark, Boxes,
  ChevronDown, ChevronsLeft, PieChart, BarChart3, LineChart, TrendingDown,
} from 'lucide-react'
import { useState, useEffect, Suspense } from 'react'
import { cn } from '../utils/cn'

/* ─── Estructura de navegación (fuente única de verdad del menú admin) ───────
   Secciones con etiqueta → items → subItems (pantallas de análisis).        */
const navSections = [
  {
    label: 'Principal',
    items: [
      {
        to: '/admin',
        label: 'Dashboard',
        icon: LayoutDashboard,
        end: true,
        subItems: [
          { to: '/admin/analisis-financiero', label: 'Análisis Financiero', icon: Landmark },
          { to: '/admin/retencion', label: 'Análisis Retención', icon: GitMerge },
        ],
      },
    ],
  },
  {
    label: 'Operación',
    items: [
      { to: '/admin/planificador', label: 'Planificador', icon: CalendarClock },
      { to: '/admin/cuentas-padre', label: 'Cuentas Padre', icon: KeyRound },
      {
        to: '/admin/clients',
        label: 'Clientes',
        icon: Users,
        subItems: [
          { to: '/admin/analisis-clientes', label: 'Análisis Demográfico', icon: PieChart },
        ],
      },
      { to: '/admin/plans', label: 'Planes', icon: Package },
      { to: '/admin/subscriptions', label: 'Suscripciones', icon: FileText },
      {
        to: '/admin/payments',
        label: 'Pagos',
        icon: CreditCard,
        subItems: [
          { to: '/admin/analisis-pagos', label: 'Análisis de Pagos', icon: BarChart3 },
        ],
      },
      {
        to: '/admin/bajas',
        label: 'Bajas',
        icon: UserX,
        subItems: [
          { to: '/admin/analisis-bajas', label: 'Análisis de Bajas', icon: TrendingDown },
        ],
      },
    ],
  },
  {
    label: 'Equipos',
    items: [
      { to: '/admin/costo-pantalla', label: 'Costo Pantalla', icon: Monitor },
      {
        to: '/admin/ventas-dispositivos',
        label: 'Venta Dispositivos',
        icon: Tv,
        subItems: [
          { to: '/admin/analisis-dispositivos', label: 'Análisis Dispositivos', icon: LineChart },
        ],
      },
      {
        to: '/admin/devices',
        label: 'Inventario Equipos',
        icon: Boxes,
        subItems: [
          { to: '/admin/analisis-inventario', label: 'Análisis Inventario', icon: BarChart3 },
        ],
      },
    ],
  },
  {
    label: 'Ajustes',
    items: [
      { to: '/admin/change-password', label: 'Seguridad', icon: KeyRound },
    ],
  },
]

// Lista plana para resolver el título de la página actual (header móvil)
const flatNav = navSections.flatMap(s => s.items.flatMap(i => [i, ...(i.subItems ?? [])]))

/* ─── Estilos propios del shell: scrollbar fino, revelado del drawer,
       tooltips del rail colapsado. Motion se apaga con reduced-motion. ───── */
const SHELL_CSS = `
  .cx-nav::-webkit-scrollbar { width: 5px }
  .cx-nav::-webkit-scrollbar-track { background: transparent }
  .cx-nav::-webkit-scrollbar-thumb { background: rgba(148,163,184,.25); border-radius: 99px }
  .cx-nav:hover::-webkit-scrollbar-thumb { background: rgba(148,163,184,.45) }
  .cx-nav { scrollbar-width: thin; scrollbar-color: rgba(148,163,184,.3) transparent }

  @keyframes cx-item-in {
    from { opacity: 0; transform: translateX(-10px) }
    to   { opacity: 1; transform: translateX(0) }
  }
  .cx-stagger > * { animation: cx-item-in .32s cubic-bezier(.22,1,.36,1) both }
  .cx-stagger > *:nth-child(1) { animation-delay: .03s }
  .cx-stagger > *:nth-child(2) { animation-delay: .07s }
  .cx-stagger > *:nth-child(3) { animation-delay: .11s }
  .cx-stagger > *:nth-child(4) { animation-delay: .15s }
  .cx-stagger > *:nth-child(5) { animation-delay: .19s }

  @media (prefers-reduced-motion: reduce) {
    .cx-stagger > * { animation: none !important }
    .cx-motion { transition: none !important }
  }
`

/* Tooltip flotante para el rail colapsado (solo desktop) */
function RailTooltip({ label }) {
  return (
    <span
      className="pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2
                 whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-900/95 px-2.5 py-1.5
                 text-xs font-medium text-slate-100 opacity-0 shadow-xl shadow-black/40 backdrop-blur
                 transition-opacity duration-150 group-hover/rail:opacity-100 hidden md:block"
      role="tooltip"
    >
      {label}
    </span>
  )
}

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(true)          // desktop: expandido / rail de iconos
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expanded, setExpanded] = useState({})    // submenús abiertos, por ruta del padre

  // Cierra el drawer móvil al cambiar de ruta
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Autoexpande el grupo cuyo hijo está activo (p. ej. al entrar por URL directa)
  useEffect(() => {
    for (const section of navSections) {
      for (const item of section.items) {
        if (item.subItems?.some(sub => location.pathname === sub.to)) {
          setExpanded(prev => (prev[item.to] ? prev : { ...prev, [item.to]: true }))
        }
      }
    }
  }, [location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    navigate('/login')
  }

  const showLabels = open || mobileOpen
  const currentPage = flatNav.find(i => location.pathname === i.to)
    ?? flatNav.find(i => i.to !== '/admin' && location.pathname.startsWith(i.to))

  return (
    <div className="h-screen bg-ui-background flex overflow-hidden">
      <style>{SHELL_CSS}</style>

      {/* Overlay detrás del drawer en mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'cx-motion relative z-50 flex flex-col text-white transition-all duration-300',
          'bg-gradient-to-b from-slate-900 via-slate-900 to-[#0a1120]',
          // Mobile: drawer fijo con borde redondeado
          'fixed inset-y-0 left-0 w-[19rem] max-w-[85vw] shadow-2xl shadow-black/50',
          'rounded-r-2xl md:rounded-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: en flujo normal
          'md:relative md:translate-x-0 md:inset-y-auto md:left-auto md:flex-shrink-0 md:shadow-none',
          open ? 'md:w-[16.5rem]' : 'md:w-[4.75rem]',
        )}
      >
        {/* Glow ambiental sutil de marca */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-44 overflow-hidden">
          <div className="absolute -top-16 -left-10 h-44 w-44 rounded-full bg-brand-primary/15 blur-3xl" />
        </div>

        {/* Cabecera / marca */}
        <div
          className={cn(
            'relative flex items-center flex-shrink-0 gap-3 px-4 pt-4 pb-4',
            !showLabels && 'md:justify-center md:px-0'
          )}
        >
          <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl
                          bg-gradient-to-br from-brand-primary to-brand-dark
                          shadow-lg shadow-brand-primary/30 ring-1 ring-white/20">
            <Tv size={20} strokeWidth={2.2} className="text-white" />
          </div>
          {showLabels && (
            <div className="min-w-0 flex-1">
              <div className="text-lg font-extrabold leading-tight tracking-tight">
                Chikisd<span className="text-brand-primary">TV</span>
              </div>
              <div className="text-[11px] font-medium tracking-wide text-slate-400">Panel Administrador</div>
            </div>
          )}
          {/* Colapsar (desktop) */}
          {showLabels && (
            <button
              onClick={() => setOpen(false)}
              className="hidden md:grid h-8 w-8 place-items-center rounded-lg text-slate-400
                         transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Colapsar menú"
              title="Colapsar menú"
            >
              <ChevronsLeft size={16} />
            </button>
          )}
          {/* Cerrar drawer (mobile) */}
          <button
            onClick={() => setMobileOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400
                       transition-colors hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Botón expandir cuando está colapsado */}
        {!showLabels && (
          <button
            onClick={() => setOpen(true)}
            className="mx-auto mb-1 hidden md:grid h-8 w-8 place-items-center rounded-lg text-slate-400
                       transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Expandir menú"
            title="Expandir menú"
          >
            <Menu size={16} />
          </button>
        )}

        <div className="mx-4 h-px flex-shrink-0 bg-gradient-to-r from-transparent via-slate-700/80 to-transparent" />

        {/* ─── Navegación ──────────────────────────────────────────────────── */}
        <nav className={cn('cx-nav flex-1 overflow-y-auto overflow-x-hidden py-3', mobileOpen && 'cx-stagger')}>
          {navSections.map((section, si) => (
            <div key={section.label} className={cn('px-3', si > 0 && 'mt-4')}>
              {showLabels ? (
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 select-none">
                  {section.label}
                </p>
              ) : (
                si > 0 && <div className="mx-2 mb-3 h-px bg-slate-700/60" />
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const hasSubs = !!item.subItems?.length
                  const isSubActive = item.subItems?.some(sub => location.pathname === sub.to)
                  const isExpanded = !!expanded[item.to]

                  return (
                    <div key={item.to}>
                      <div className="group/rail relative flex items-center">
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) => cn(
                            'flex min-h-[42px] flex-1 items-center gap-3 rounded-xl px-3 py-2.5 md:py-2',
                            'text-[13.5px] font-medium transition-all duration-200 touch-manipulation',
                            hasSubs && showLabels && 'pr-9',
                            !showLabels && 'md:justify-center md:px-0',
                            isActive
                              ? 'bg-gradient-to-r from-brand-primary to-orange-500 text-white shadow-lg shadow-brand-primary/30'
                              : isSubActive
                                ? 'bg-white/[.06] text-white'
                                : 'text-slate-400 hover:bg-white/[.06] hover:text-white active:bg-white/10'
                          )}
                        >
                          <Icon size={18} strokeWidth={2} className="flex-shrink-0" />
                          {showLabels && <span className="truncate">{item.label}</span>}
                        </NavLink>

                        {/* Tooltip en rail colapsado */}
                        {!showLabels && <RailTooltip label={item.label} />}

                        {/* Toggle de submenú */}
                        {hasSubs && showLabels && (
                          <button
                            onClick={() => setExpanded(prev => ({ ...prev, [item.to]: !prev[item.to] }))}
                            className={cn(
                              'absolute right-1.5 grid h-7 w-7 place-items-center rounded-lg',
                              'text-slate-500 transition-all duration-200 hover:bg-white/10 hover:text-white',
                              (isSubActive || location.pathname === item.to) && 'text-white/80'
                            )}
                            aria-label={`${isExpanded ? 'Contraer' : 'Expandir'} ${item.label}`}
                            aria-expanded={isExpanded}
                          >
                            <ChevronDown
                              size={14}
                              className={cn('cx-motion transition-transform duration-200', isExpanded && 'rotate-180')}
                            />
                          </button>
                        )}
                      </div>

                      {/* Submenú colapsable (truco grid-rows para animar altura) */}
                      {hasSubs && showLabels && (
                        <div
                          className={cn(
                            'cx-motion grid transition-[grid-template-rows,opacity] duration-300 ease-out',
                            isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                          )}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className="relative ml-[1.35rem] mt-0.5 space-y-0.5 border-l border-slate-700/60 pl-3 pb-1">
                              {item.subItems.map(sub => {
                                const SubIcon = sub.icon
                                return (
                                  <NavLink
                                    key={sub.to}
                                    to={sub.to}
                                    className={({ isActive }) => cn(
                                      'relative flex min-h-[36px] items-center gap-2.5 rounded-lg px-2.5 py-1.5',
                                      'text-[12.5px] font-medium transition-colors duration-150',
                                      isActive
                                        ? 'bg-white/[.07] text-brand-primary'
                                        : 'text-slate-500 hover:bg-white/[.05] hover:text-slate-200'
                                    )}
                                  >
                                    {({ isActive }) => (
                                      <>
                                        {/* Marcador sobre el riel guía */}
                                        <span
                                          aria-hidden
                                          className={cn(
                                            'absolute -left-[calc(0.75rem+1.5px)] h-1.5 w-1.5 rounded-full transition-colors',
                                            isActive ? 'bg-brand-primary shadow-[0_0_8px_rgba(249,115,22,.8)]' : 'bg-slate-700'
                                          )}
                                        />
                                        <SubIcon size={14} className="flex-shrink-0" />
                                        <span className="truncate">{sub.label}</span>
                                      </>
                                    )}
                                  </NavLink>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ─── Footer: usuario + cerrar sesión ─────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-slate-800/80 bg-slate-950/40 px-3 py-3
                        pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className={cn('flex items-center gap-3', !showLabels && 'md:flex-col md:gap-2')}>
            <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full
                            bg-gradient-to-br from-slate-600 to-slate-700 text-sm font-bold text-white
                            ring-2 ring-slate-700/80">
              A
            </div>
            {showLabels && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-200">Administrador</p>
                <p className="truncate text-[11px] text-slate-500">admin@chikisdtv.com</p>
              </div>
            )}
            <div className="group/rail relative">
              <button
                onClick={handleLogout}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-400
                           transition-colors hover:bg-red-500/15 hover:text-red-400 touch-manipulation"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut size={17} />
              </button>
              {!showLabels && <RailTooltip label="Cerrar sesión" />}
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Área de contenido ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header sticky — solo mobile */}
        <header className="md:hidden flex h-14 flex-shrink-0 items-center gap-2 border-b border-slate-800
                           bg-slate-900/95 px-3 text-white backdrop-blur supports-[backdrop-filter]:bg-slate-900/85">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl transition-colors
                       hover:bg-white/10 active:bg-white/15 touch-manipulation"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold leading-tight">
              {currentPage?.label ?? <>Chikisd<span className="text-brand-primary">TV</span></>}
            </p>
            {currentPage && <p className="text-[10px] font-medium text-slate-500 leading-tight">ChikisdTV · Admin</p>}
          </div>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-primary to-brand-dark">
            <Tv size={16} className="text-white" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-3 md:p-6">
            {/* Suspense local: al navegar entre páginas el shell (sidebar/header)
                permanece visible y solo el contenido muestra el loader */}
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="w-9 h-9 rounded-full border-[3px] border-orange-200 border-t-brand-primary animate-spin" />
                <p className="text-sm text-gray-400">Cargando…</p>
              </div>
            }>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
