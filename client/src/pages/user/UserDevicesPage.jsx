import { useEffect, useState } from 'react'
import api from '../../config/api'
import { Card, CardBody } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'

export default function UserDevicesPage() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/user/my-devices')
      .then((r) => setDevices(r.data))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { key: 'nombre', label: 'Dispositivo' },
    { key: 'tipo', label: 'Tipo', render: (r) => <Badge variant="info">{r.tipo}</Badge> },
    { key: 'mac', label: 'MAC' },
    { key: 'plan', label: 'Plan asignado', render: (r) => r.subscription?.plan?.nombre || '—' },
    { key: 'activo', label: 'Estado', render: (r) => <Badge variant={r.activo ? 'success' : 'neutral'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge> }
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-brand-accent">Mis Dispositivos</h1>
        <p className="text-gray-500">Equipos y pantallas asignados</p>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? <p className="p-8 text-center text-gray-500">Cargando…</p> : <DataTable columns={columns} data={devices} emptyMessage="No tienes dispositivos registrados" />}
        </CardBody>
      </Card>
    </div>
  )
}
