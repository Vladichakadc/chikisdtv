import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tv, Loader2 } from 'lucide-react'
import api from '../config/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', data.token)
      localStorage.setItem('role', data.role)
      localStorage.setItem('name', data.name)

      if (data.mustChangePassword) {
        navigate('/change-password')
      } else {
        navigate(data.role === 'admin' ? '/admin' : '/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-accent via-slate-800 to-black p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-primary rounded-2xl text-white mb-4">
            <Tv size={32} />
          </div>
          <h1 className="text-3xl font-bold text-brand-accent">ChikisdTV</h1>
          <p className="text-gray-500 mt-1">Portal de Gestión IPTV</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@chikisdtv.com"
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Iniciar sesión'}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          ChikisdTV © 2026
        </p>
      </div>
    </div>
  )
}
