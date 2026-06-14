import { useEffect, useState } from 'react'
import api from '../../config/api'
import { Card, CardBody } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatDate, formatCurrency } from '../../utils/excelUtils'

export default function UserSubscriptionPage() {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/user/my-subscriptions')
      .then((r) => setSubs(r.data))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { key: 'plan', label: 'Plan', render: (r) => r.plan?.nombre || '—' },
    { key: 'precio', label: 'Precio', render: (r) => formatCurrency(r.plan?.precio) },
    { key: 'fechaInicio', label: 'Inicio', render: (r) => formatDate(r.fechaInicio) },
    { key: 'fechaVencimiento', label: 'Vence', render: (r) => formatDate(r.fechaVencimiento) },
    {
      key: 'estado', label: 'Estado', render: (r) => (
        <Badge variant={r.estado === 'Activo' ? 'success' : r.estado === 'Vencido' ? 'error' : 'neutral'}>{r.estado}</Badge>
      )
    }
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-brand-accent">Mi Suscripción</h1>
        <p className="text-gray-500">Historial de tus planes contratados</p>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? <p className="p-8 text-center text-gray-500">Cargando…</p> : <DataTable columns={columns} data={subs} emptyMessage="No tienes suscripciones registradas" />}
        </CardBody>
      </Card>
    </div>
  )
}
