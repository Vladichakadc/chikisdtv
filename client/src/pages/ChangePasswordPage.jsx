import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import api from '../config/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter'

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [daysRemaining, setDaysRemaining] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/user/me')
        if (data.role === 'admin' && data.passwordLastChanged) {
          const daysSince = (new Date() - new Date(data.passwordLastChanged)) / (1000 * 60 * 60 * 24)
          const remaining = Math.max(0, 90 - Math.floor(daysSince))
          setDaysRemaining(remaining)
        }
      } catch (err) {
        console.error('Error fetching profile', err)
      }
    }
    fetchProfile()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirm) return setError('Las contraseñas no coinciden')
    if (newPassword.length < 6) return setError('Mínimo 6 caracteres')
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/change-password', { newPassword })
      const role = localStorage.getItem('role')
      navigate(role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full min-h-[80vh] flex items-center justify-center bg-transparent p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-light rounded-xl text-brand-dark mb-3">
            <KeyRound size={28} />
          </div>
          <h1 className="text-2xl font-bold text-brand-accent">Cambiar contraseña</h1>
          <p className="text-sm text-gray-500">Actualiza tu contraseña para mantener tu cuenta segura.</p>
        </div>

        {daysRemaining !== null && daysRemaining <= 5 && (
          <div className={`mb-6 p-4 rounded-xl flex gap-3 text-sm font-medium fade-in ${daysRemaining === 0 ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'}`}>
            <AlertTriangle className="flex-shrink-0" size={20} />
            <div>
              {daysRemaining === 0 
                ? 'Tu contraseña ha caducado (90 días). Por política de seguridad, es obligatorio cambiarla ahora mismo.' 
                : `Tu contraseña caducará en ${daysRemaining} día(s). Por favor actualízala para no perder acceso.`}
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-accent mb-1">Nueva contraseña</label>
            <div className="relative">
              <Input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-primary focus:outline-none transition-colors">
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <PasswordStrengthMeter password={newPassword} />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-accent mb-1">Confirmar contraseña</label>
            <div className="relative">
              <Input type={showConfirmPassword ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-primary focus:outline-none transition-colors">
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Guardando…' : 'Cambiar contraseña'}
          </Button>
        </form>
      </div>
    </div>
  )
}
