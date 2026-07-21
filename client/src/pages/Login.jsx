import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Tv, Loader2, Lock, Mail, Eye, EyeOff } from 'lucide-react'
import api from '../config/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const STYLES = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
  .fade-in { animation: fadeInUp 0.6s ease-out forwards; }
  .fade-in-1 { animation-delay: 0.1s; opacity: 0; }
  .fade-in-2 { animation-delay: 0.2s; opacity: 0; }
  .fade-in-3 { animation-delay: 0.3s; opacity: 0; }
  .fade-in-4 { animation-delay: 0.4s; opacity: 0; }
  .floating { animation: float 3s ease-in-out infinite; }
  .loading-shimmer { animation: shimmer 2s infinite; }
  .input-focus:focus-within {
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
  }
  .button-hover:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(249, 115, 22, 0.3);
  }
  .error-pulse {
    animation: fadeInUp 0.4s ease-out;
  }
`

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState(null)
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
        navigate('/admin')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-brand-accent/5 to-black p-4 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-brand-primary/10 rounded-full blur-3xl opacity-50 floating" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-50" />

        {/* Main Card */}
        <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
          {/* Header Accent */}
          <div className="h-1 bg-gradient-to-r from-brand-primary via-blue-500 to-brand-primary" />

          <div className="p-8 sm:p-10">
            {/* Logo Section */}
            <div className="text-center mb-8 fade-in fade-in-1">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-brand-primary to-blue-600 rounded-2xl text-white mb-4 shadow-lg hover:shadow-xl transition-shadow">
                <Tv size={40} className="floating" />
              </div>
              <h1 className="text-4xl font-bold text-brand-accent">
                Chikids<span className="text-brand-primary">TV</span>
              </h1>
              <p className="text-gray-500 mt-2 text-sm font-medium tracking-wide">
                PLATAFORMA DE GESTIÓN IPTV PROFESIONAL
              </p>
            </div>

            {/* Subtitle */}
            <p className="text-center text-gray-600 text-sm mb-8 fade-in fade-in-2">
              Accede a tu panel de control para gestionar suscripciones y clientes
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div className="fade-in fade-in-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                <div className="relative input-focus">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    required
                    placeholder="admin@chikidstv.com"
                    className="pl-10 relative z-0"
                    style={{
                      transition: 'all 0.3s ease',
                      borderColor: focusedField === 'email' ? '#f97316' : undefined,
                    }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="fade-in fade-in-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                <div className="relative input-focus">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    required
                    placeholder="••••••••"
                    className="pl-10 pr-10 relative z-0"
                    style={{
                      transition: 'all 0.3s ease',
                      borderColor: focusedField === 'password' ? '#f97316' : undefined,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-primary focus:outline-none z-10 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error State */}
              {error && (
                <div className="error-pulse bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 text-sm p-4 rounded-lg flex items-start gap-3">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <p className="font-medium">{error}</p>
                    <p className="text-xs text-red-600 mt-1">Verifica tus credenciales e intenta nuevamente</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="button-hover w-full py-3 px-4 bg-gradient-to-r from-brand-primary to-blue-600 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-80 disabled:cursor-not-allowed mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <>
                    <span>Iniciar Sesión</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>

            {/* Change Password Link */}
            <div className="mt-6 text-center fade-in fade-in-4">
              <Link to="/public-change-password" className="text-sm text-brand-primary hover:text-orange-500 font-medium transition-colors">
                ¿Deseas cambiar tu contraseña?
              </Link>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center justify-center fade-in fade-in-4">
              <p className="text-center text-xs text-gray-400 font-medium tracking-wide">
                ChikidsTV © {new Date().getFullYear()} • Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
