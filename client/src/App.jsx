import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import DashboardLayout from './layouts/DashboardLayout'

// Code-splitting por ruta: cada página se descarga solo cuando se visita.
// En móvil esto reduce la carga inicial de ~2MB a una fracción — el login y el
// shell cargan de inmediato y el resto llega bajo demanda.
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'))
const DashboardHome = lazy(() => import('./pages/admin/DashboardHome'))
const ClientsPage = lazy(() => import('./pages/admin/ClientsPage'))
const PlansPage = lazy(() => import('./pages/admin/PlansPage'))
const SubscriptionsPage = lazy(() => import('./pages/admin/SubscriptionsPage'))
const PaymentsPage = lazy(() => import('./pages/admin/PaymentsPage'))
const DevicesPage = lazy(() => import('./pages/admin/DevicesPage'))
const PlanificadorPage = lazy(() => import('./pages/admin/PlanificadorPage'))
const BajasPage = lazy(() => import('./pages/admin/BajasPage'))
const CostoPantallaPage = lazy(() => import('./pages/admin/CostoPantallaPage'))
const CuentasPadrePage = lazy(() => import('./pages/admin/CuentasPadrePage'))
const AnalisisRetencionPage = lazy(() => import('./pages/admin/AnalisisRetencionPage'))
const AnalisisFinancieroPage = lazy(() => import('./pages/admin/AnalisisFinancieroPage'))
const AnalisisDispositivosPage = lazy(() => import('./pages/admin/AnalisisDispositivosPage'))
const VentaDispositivosPage = lazy(() => import('./pages/admin/VentaDispositivosPage'))

function RequireAuth({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

// Indicador de carga entre rutas — ligero y con la identidad de la marca
function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-9 h-9 rounded-full border-[3px] border-orange-200 border-t-brand-primary animate-spin" />
      <p className="text-sm text-gray-400">Cargando…</p>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<RequireAuth><Navigate to="/admin" replace /></RequireAuth>} />
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />

        <Route path="/admin" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
          <Route index element={<DashboardHome />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="ventas-dispositivos" element={<VentaDispositivosPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="planificador" element={<PlanificadorPage />} />
          <Route path="bajas" element={<BajasPage />} />
          <Route path="costo-pantalla" element={<CostoPantallaPage />} />
          <Route path="cuentas-padre" element={<CuentasPadrePage />} />
          <Route path="retencion" element={<AnalisisRetencionPage />} />
          <Route path="analisis-financiero" element={<AnalisisFinancieroPage />} />
          <Route path="analisis-dispositivos" element={<AnalisisDispositivosPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  )
}
