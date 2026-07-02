import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import ChangePasswordPage from './pages/ChangePasswordPage'
import DashboardLayout from './layouts/DashboardLayout'

// Admin pages
import DashboardHome from './pages/admin/DashboardHome'
import ClientsPage from './pages/admin/ClientsPage'
import PlansPage from './pages/admin/PlansPage'
import SubscriptionsPage from './pages/admin/SubscriptionsPage'
import PaymentsPage from './pages/admin/PaymentsPage'
import DevicesPage from './pages/admin/DevicesPage'
import PlanificadorPage from './pages/admin/PlanificadorPage'
import BajasPage from './pages/admin/BajasPage'
import CostoPantallaPage from './pages/admin/CostoPantallaPage'
import CuentasPadrePage from './pages/admin/CuentasPadrePage'
import AnalisisRetencionPage from './pages/admin/AnalisisRetencionPage'
import AnalisisFinancieroPage from './pages/admin/AnalisisFinancieroPage'
import AnalisisDispositivosPage from './pages/admin/AnalisisDispositivosPage'
import VentaDispositivosPage from './pages/admin/VentaDispositivosPage'

function RequireAuth({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
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
  )
}
