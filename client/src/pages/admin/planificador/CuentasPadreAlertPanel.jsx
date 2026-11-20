// Panel de alertas de Cuentas Padre (vencidas / en alerta) del Planificador.
import { Building2, X, ExternalLink } from 'lucide-react'
import { formatDate } from '../../../utils/excelUtils'

export function CuentasPadreAlertPanel({ cuentas, titulo, variante, onClose, navigate }) {
  const isVencidas = variante === 'vencida'
  const headerGrad = isVencidas ? 'from-red-600 to-red-700' : 'from-amber-500 to-amber-600'
  return (
    <div className="pl-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[3px] p-4" onClick={onClose}>
      <div className="pl-confirm bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80dvh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className={`bg-gradient-to-r ${headerGrad} rounded-t-2xl px-6 py-4 flex items-center justify-between flex-shrink-0`}>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 size={20} /> {titulo}
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50">
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold border-b border-gray-200">ID Cuenta</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold border-b border-gray-200">Usuario IPTV</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold text-center border-b border-gray-200">Vencimiento</th>
                <th className="sticky top-0 bg-gray-50 px-4 py-2.5 font-semibold text-center border-b border-gray-200">Días</th>
              </tr>
            </thead>
            <tbody>
              {cuentas.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Sin registros en esta categoría</td></tr>
              ) : cuentas.map(cp => (
                <tr key={cp.cuentaId} className={`border-b border-gray-50 ${isVencidas ? 'bg-red-50 hover:bg-red-100' : 'bg-amber-50 hover:bg-amber-100'}`}>
                  <td className="px-4 py-2.5 font-mono font-bold text-brand-accent">{cp.cuentaId}</td>
                  <td className="px-4 py-2.5 text-gray-700">{cp.nombre || <span className="text-gray-400 italic">—</span>}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{cp.fin ? formatDate(cp.fin) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-center">
                    {cp.diasAlFin != null ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${cp.diasAlFin <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {cp.diasAlFin <= 0 ? `${Math.abs(cp.diasAlFin)}d vencida` : `${cp.diasAlFin}d`}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => navigate('/admin/cuentas-padre')}
            className="flex items-center gap-1.5 text-sm text-brand-primary hover:underline font-medium"
          >
            <ExternalLink size={13} /> Ver en Cuentas Padre
          </button>
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
