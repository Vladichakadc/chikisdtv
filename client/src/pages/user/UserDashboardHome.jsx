import { useEffect, useState } from 'react'
import { Tv, CreditCard, Clock, CheckCircle2 } from 'lucide-react'
import api from '../../config/api'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { formatDate, formatCurrency } from '../../utils/excelUtils'

function StatCard({ icon: Icon, title, value, color }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-brand-accent mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </Card>
  )
}

export default function UserDashboardHome() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const name = localStorage.getItem('name') || 'Cliente'

  useEffect(() => {
    api.get('/user/my-summary')
      .then((r) => setSummary(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-500">Cargando…</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-brand-accent">Hola, {name}</h1>
        <p className="text-gray-500">Bienvenido a tu portal ChikidsTV</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={CheckCircle2} title="Suscripción" value={summary?.activeSub ? 'Activa' : 'Sin suscripción'} color="bg-green-500" />
        <StatCard icon={Tv} title="Mis Dispositivos" value={summary?.totalDevices || 0} color="bg-purple-500" />
        <StatCard icon={Clock} title="Pagos Pendientes" value={summary?.pendingPayments || 0} color="bg-amber-500" />
        <StatCard icon={CreditCard} title="Total Pagado" value={formatCurrency(summary?.totalPagado || 0)} color="bg-brand-primary" />
      </div>

      {summary?.activeSub && (
        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold text-brand-accent mb-3">Mi suscripción activa</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Plan</p>
                <p className="font-semibold text-brand-accent">{summary.activeSub.plan?.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vence</p>
                <p className="font-semibold text-brand-accent">{formatDate(summary.activeSub.fechaVencimiento)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <Badge variant="success">{summary.activeSub.estado}</Badge>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
