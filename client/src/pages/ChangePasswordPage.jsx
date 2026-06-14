import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import api from '../config/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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
    <div className="min-h-screen flex items-center justify-center bg-ui-background p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-light rounded-xl text-brand-dark mb-3">
            <KeyRound size={28} />
          </div>
          <h1 className="text-2xl font-bold text-brand-accent">Cambiar contraseña</h1>
          <p className="text-sm text-gray-500">Debes actualizar tu contraseña antes de continuar</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Input label="Nueva contraseña" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          <Input label="Confirmar contraseña" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Guardando…' : 'Cambiar contraseña'}
          </Button>
        </form>
      </div>
    </div>
  )
}
