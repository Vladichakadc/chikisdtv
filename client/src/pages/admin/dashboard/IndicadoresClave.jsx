import { formatCurrency } from '../../../utils/excelUtils'
import { cn } from '../../../utils/cn'

// Cuatro cifras que resumen el negocio hoy, en una sola franja, y una línea
// secundaria con el inventario. Cada cifra abre su explicación.

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Mes en curso y mes anterior desde la serie mensual de /dashboard-bi
export function ingresosDelMes(porMes = [], hoy = new Date()) {
  const clave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const ant = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  const actual = porMes.find(m => m.key === clave(hoy))
  const anterior = porMes.find(m => m.key === clave(ant))
  return {
    mes: MESES[hoy.getMonth()],
    mesAnterior: MESES[ant.getMonth()],
    ingresos: actual?.ingresos ?? 0,
    ventas: actual?.numVentas ?? 0,
    ingresosAnterior: anterior?.ingresos ?? 0,
  }
}

function Cifra({ etiqueta, valor, detalle, tono, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="text-left px-3.5 sm:px-5 py-4 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none transition-colors min-w-0">
      <span className="dash-txt block text-[13px] font-medium text-slate-500">{etiqueta}</span>
      <span className={cn('dash-num block text-[27px] sm:text-[38px] font-bold leading-tight break-words', tono || 'text-slate-900')}>{valor}</span>
      <span className="dash-txt block text-[13px] text-slate-500 leading-snug">{detalle}</span>
    </button>
  )
}

export function IndicadoresClave({ bi, stats, operacion, onExplicar, onIr }) {
  const m = ingresosDelMes(bi?.porMes)
  const cap = operacion?.capacidad ?? { total: 0, ocupadas: 0, libres: 0, pctOcupacion: 0 }
  const conServicio = operacion?.clientes.activos ?? 0
  const usd = stats?.montoDeudaUSD ?? 0
  const bajas = stats?.bajasEsteAnio ?? 0

  return (
    <section aria-label="Indicadores clave" className="mb-8">
      <div className="rounded-[24px] bg-white ring-1 ring-slate-200/80 grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100 overflow-hidden [&>*:nth-child(2)]:border-t-0 lg:[&>*]:border-t-0">
        <Cifra
          etiqueta={`Ingresos de ${m.mes} (en curso)`}
          valor={formatCurrency(m.ingresos)}
          detalle={`${m.ventas} ${m.ventas === 1 ? 'venta' : 'ventas'} · ${m.mesAnterior}: ${formatCurrency(m.ingresosAnterior)}`}
          tono="text-brand-primary"
          onClick={() => onExplicar({
            title: `Ingresos de ${m.mes}`, value: formatCurrency(m.ingresos),
            queEs: 'Lo vendido en licencias durante el mes en curso. El mes todavía no termina, así que se compara con el total del mes anterior como referencia.',
            comoSeCalcula: 'Se suma el **precio de venta** de las ventas de licencias registradas este mes (módulo Pagos → Ventas de licencias).',
            origen: `Ventas de licencias: ${m.ventas} este mes; ${m.mesAnterior} cerró en ${formatCurrency(m.ingresosAnterior)}.`,
            action: { label: 'Ver ventas', onClick: () => onIr('/admin/payments') },
          })}
        />
        <Cifra
          etiqueta="Ocupación de pantallas"
          valor={`${cap.pctOcupacion}%`}
          detalle={`${cap.ocupadas} de ${cap.total} con cliente · ${cap.libres} libres`}
          tono={cap.pctOcupacion >= 95 ? 'text-red-600' : undefined}
          onClick={() => onExplicar({
            title: 'Ocupación de pantallas', value: `${cap.pctOcupacion}%`,
            queEs: 'Qué parte de las pantallas configuradas en las cuentas padre ya tiene un cliente asignado. Cerca del 100% significa que la próxima venta necesita una cuenta padre nueva.',
            comoSeCalcula: 'Pantallas con cliente ÷ pantallas configuradas en el Planificador (se suma la columna #).',
            origen: `Planificador: ${cap.ocupadas} ocupadas y ${cap.libres} libres de ${cap.total}.`,
            action: { label: 'Ver Planificador', onClick: () => onIr('/admin/planificador') },
          })}
        />
        <Cifra
          etiqueta="Clientes con servicio"
          valor={conServicio.toLocaleString('es-CO')}
          detalle={`${stats?.totalClients ?? 0} activos en Clientes · ${bajas} ${bajas === 1 ? 'baja' : 'bajas'} en ${stats?.anioActual ?? ''}`}
          onClick={() => onExplicar({
            title: 'Clientes con servicio', value: conServicio,
            queEs: 'Clientes distintos que hoy tienen al menos una pantalla asignada en el Planificador, vigente o vencida sin dar de baja.',
            comoSeCalcula: 'Se cuentan los clientes únicos (por ID de cliente o nickname) de las pantallas con cliente. Un cliente con varias pantallas cuenta una vez.',
            origen: `Planificador. El módulo Clientes registra ${stats?.totalClients ?? 0} clientes activos; la diferencia son clientes registrados sin pantalla asignada.`,
            action: { label: 'Ver Clientes', onClick: () => onIr('/admin/clients') },
          })}
        />
        <Cifra
          etiqueta="Por cobrar"
          valor={formatCurrency(stats?.montoDeudaTotal ?? 0)}
          detalle={`${stats?.clientesConDeuda ?? 0} ${stats?.clientesConDeuda === 1 ? 'cliente' : 'clientes'}${usd > 0 ? ` · más US$${Number(usd).toLocaleString('en-US')}` : ''}`}
          tono={(stats?.clientesConDeuda ?? 0) > 0 ? 'text-orange-600' : undefined}
          onClick={() => onExplicar({
            title: 'Por cobrar', value: formatCurrency(stats?.montoDeudaTotal ?? 0),
            queEs: 'Saldo pendiente de los clientes marcados como "debe" en el Planificador. La cartera en dólares se muestra aparte.',
            comoSeCalcula: 'Se suma el **monto que debe** (COP) y el **monto en USD** de las pantallas con debe = sí. Un cliente con varias pantallas cuenta una vez.',
            origen: 'Planificador (campos debe, monto que debe y monto en USD).',
            action: { label: 'Ver Planificador', onClick: () => onIr('/admin/planificador') },
          })}
        />
      </div>
      <p className="dash-txt mt-2.5 px-1 text-[13px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
        <button type="button" onClick={() => onIr('/admin/plans')} className="hover:text-slate-800">{stats?.totalPlans ?? 0} planes en el catálogo</button>
        <button type="button" onClick={() => onIr('/admin/devices')} className="hover:text-slate-800">{stats?.equipos?.disponibles ?? 0} equipos en bodega de {stats?.equipos?.total ?? 0}</button>
        <span>{operacion?.pantallas.cortesias ?? 0} cortesías activas</span>
      </p>
    </section>
  )
}
