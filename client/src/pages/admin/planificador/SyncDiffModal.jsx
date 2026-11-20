import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, KeyRound, Link2, Monitor, Pencil, Undo2, X } from 'lucide-react'
import { formatDate } from '../../../utils/excelUtils'

// Informe de "Sincronizar CP": qué trajo el Planificador del módulo Cuentas
// Padre (usuario IPTV, contraseña, crédito, fechas). Las contraseñas se copian
// cifradas y aquí solo se indica que cambiaron (••••••), nunca su valor.

const SYNC_CAMPO_LABELS = {
  cuenta:       'Usuario',
  password:     'Contraseña',
  credito:      'Crédito',
  inicio:       'Inicio',
  finalizacion: 'Fin',
}

const valorCampo = (campo, v) => {
  if (v == null || v === '') return '—'
  return campo === 'inicio' || campo === 'finalizacion' ? formatDate(v) : v
}

// ─── Modal informe comparativo de sincronización con Cuentas Padre ────────────

function VencimientoChip({ diasAlFin }) {
  if (diasAlFin == null) return <span className="text-gray-300 text-xs">—</span>
  if (diasAlFin <= 0)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold whitespace-nowrap"><AlertTriangle size={10} /> Vencida</span>
  if (diasAlFin <= 7)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold whitespace-nowrap"><Clock size={10} /> {diasAlFin}d</span>
  return <span className="text-gray-500 text-xs whitespace-nowrap">{diasAlFin}d</span>
}

export function SyncDiffModal({ diff, canUndo, onUndo, onClose, undoing }) {
  const [soloConCambios, setSoloConCambios] = useState(false)

  const actualizadas  = diff.filter(d => d.status === 'actualizada')
  const sinCambio     = diff.filter(d => d.status === 'sin_cambio')
  const sinPantallas  = diff.filter(d => d.status === 'sin_pantallas')
  const creadas       = diff.filter(d => d.status === 'creada')
  const vencidas      = diff.filter(d => d.diasAlFin != null && d.diasAlFin <= 0)
  const porVencer     = diff.filter(d => d.diasAlFin != null && d.diasAlFin > 0 && d.diasAlFin <= 7)

  const visible = soloConCambios
    ? [...creadas, ...actualizadas]
    : [...creadas, ...actualizadas, ...sinCambio]

  return (
    <div className="pl-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[3px] p-2 sm:p-4" onClick={onClose}>
      <div className="pl-confirm bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90dvh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-t-2xl px-4 sm:px-6 py-4 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Link2 size={20} /> Sincronización con Cuentas Padre
            </h2>
            <p className="text-slate-300 text-sm">Usuario · contraseña · crédito · fechas de inicio y fin, desde el módulo Cuentas Padre</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Chips resumen */}
        <div className="flex items-center flex-wrap gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex-shrink-0">
          {vencidas.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-semibold">
              <AlertTriangle size={13} />
              {vencidas.length} vencida{vencidas.length > 1 ? 's' : ''}
            </span>
          )}
          {porVencer.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
              <Clock size={13} />
              {porVencer.length} por vencer
            </span>
          )}
          {creadas.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
              <Monitor size={13} />
              {creadas.length} nueva{creadas.length > 1 ? 's' : ''}
            </span>
          )}
          {actualizadas.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold">
              <Pencil size={13} />
              {actualizadas.length} con cambio{actualizadas.length > 1 ? 's' : ''}
            </span>
          )}
          {sinCambio.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 text-sm font-semibold">
              <CheckCircle2 size={13} />
              {sinCambio.length} sin cambio
            </span>
          )}
          {sinPantallas.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-sm font-semibold">
              <Monitor size={13} />
              {sinPantallas.length} sin pantallas
            </span>
          )}
          <button
            onClick={() => setSoloConCambios(s => !s)}
            className={`ml-auto text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              soloConCambios
                ? 'bg-orange-500 text-white border-orange-500'
                : 'border-gray-300 text-gray-500 hover:border-orange-300 hover:text-orange-600'
            }`}
          >
            {soloConCambios ? 'Mostrar todos' : 'Solo con cambios'}
          </button>
        </div>

        {/* Tabla de diff */}
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full min-w-[860px] text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50">
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold border-b border-gray-200">ID Cuenta</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold border-b border-gray-200">Usuario IPTV</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold text-center border-b border-gray-200">Pantallas</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold text-center border-b border-gray-200">Estado cuenta</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold text-center border-b border-gray-200">Vencimiento</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold text-center border-b border-gray-200">Contraseña</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold text-center border-b border-gray-200">Sincronización</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold border-b border-gray-200">Cambios detectados</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    <CheckCircle2 size={28} className="mx-auto mb-2 text-gray-300" />
                    Todos los datos ya estaban sincronizados.
                  </td>
                </tr>
              )}
              {visible.map((item, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-50 ${
                    item.status === 'actualizada' ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono font-bold text-brand-accent whitespace-nowrap">
                    {item.cuentaId}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 max-w-[160px] truncate">
                    {item.cuenta || <span className="text-gray-400 italic">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-600 font-medium">
                    {item.pantallasAfectadas > 0 ? item.pantallasAfectadas : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    {item.estado
                      ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${item.estado === 'Válido' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.estado}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <VencimientoChip diasAlFin={item.diasAlFin} />
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    {item.tienePassword
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold"><KeyRound size={10} /> Vigente</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold"><AlertTriangle size={10} /> Sin contraseña</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    {item.status === 'actualizada' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                        <Pencil size={10} /> Actualizada
                      </span>
                    ) : item.status === 'creada' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                        <Monitor size={10} /> Nueva
                      </span>
                    ) : item.status === 'sin_pantallas' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
                        <Monitor size={10} /> Sin pantallas
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 text-xs font-semibold">
                        <CheckCircle2 size={10} /> Sin cambio
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {item.cambios.length > 0 ? (
                      <div className="space-y-1">
                        {item.cambios.map((c, j) => (
                          <div key={j} className="flex items-baseline flex-wrap gap-1 text-xs">
                            <span className="font-semibold text-gray-700 whitespace-nowrap">
                              {SYNC_CAMPO_LABELS[c.campo] || c.campo}:
                            </span>
                            <span className="text-red-500 line-through whitespace-nowrap">
                              {valorCampo(c.campo, c.antes)}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-green-700 font-semibold whitespace-nowrap">
                              {valorCampo(c.campo, c.despues)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex items-center justify-end sm:justify-between gap-3 flex-shrink-0">
          <p className="text-xs text-gray-400 hidden sm:block">
            <CheckCircle2 size={12} className="inline mr-1 text-green-500" />
            El Planificador ya muestra los datos vigentes de Cuentas Padre.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {canUndo && (
              <button
                onClick={onUndo}
                disabled={undoing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-40 text-sm font-medium transition-colors"
              >
                <Undo2 size={14} /> {undoing ? 'Deshaciendo…' : 'Deshacer sincronización'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
