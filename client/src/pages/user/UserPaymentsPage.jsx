import { useEffect, useState } from 'react'
import api from '../../config/api'
import { Card, CardBody } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatDate, formatCurrency } from '../../utils/excelUtils'

export default function UserPaymentsPage() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/user/my-payments')
      .then((r) => setPayments(r.data))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { key: 'fechaPago', label: 'Fecha', render: (r) => formatDate(r.fechaPago) },
    { key: 'monto', label: 'Monto', render: (r) => formatCurrency(r.monto) },
    { key: 'metodoPago', label: 'Método' },
    { key: 'plan', label: 'Plan', render: (r) => r.subscription?.plan?.nombre || '—' },
    {
      key: 'estado', label: 'Estado', render: (r) => (
        <Badge variant={r.estado === 'Pagado' ? 'success' : r.estado === 'Pendiente' ? 'warning' : 'error'}>{r.estado}</Badge>
      )
    }
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-brand-accent">Mis Pagos</h1>
        <p className="text-gray-500">Historial de tus pagos y cobros</p>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? <p className="p-8 text-center text-gray-500">Cargando…</p> : <DataTable columns={columns} data={payments} emptyMessage="No tienes pagos registrados" />}
        </CardBody>
      </Card>
    </div>
  )
}
