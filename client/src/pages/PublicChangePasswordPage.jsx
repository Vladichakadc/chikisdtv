import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { KeyRound, Loader2, Lock, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import api from '../config/api'
import { Input } from '../components/ui/Input'

const STYLES = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .fade-in {
    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
  }
  
  .fade-in-1 { animation-delay: 0.1s; }
  .fade-in-2 { animation-delay: 0.2s; }
  .fade-in-3 { animation-delay: 0.3s; }
  .fade-in-4 { animation-delay: 0.4s; }
  .fade-in-5 { animation-delay: 0.5s; }

  .glass-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 
      0 4px 24px -1px rgba(0, 0, 0, 0.05),
      0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  }

  .input-focus:focus-within {
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
  }

  .button-hover:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
  }
  
  .error-pulse {
    animation: pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  @keyframes pulse-border {
    0%, 100% { border-color: rgba(239, 68, 68, 0.3); }
    50% { border-color: rgba(239, 68, 68, 0.8); }
  }
`

export default function PublicChangePasswordPage() {
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (newPassword.length < 6) {
      return setError('La nueva contraseña debe tener al menos 6 caracteres')
    }
    if (newPassword !== confirmPassword) {
      return setError('Las contraseñas nuevas no coinciden')
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/public-change-password', {
        email,
        currentPassword,
        newPassword
      })
      
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar la contraseña. Verifica tus datos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#fafafa]">
        
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-brand-primary/5 blur-[120px] mix-blend-multiply" />
          <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px] mix-blend-multiply" />
          <div className="absolute -bottom-[20%] left-[20%] w-[80%] h-[80%] rounded-full bg-orange-400/5 blur-[120px] mix-blend-multiply" />
        </div>

        <div className="w-full max-w-[420px] relative z-10">
          <div className="glass-card rounded-[2rem] p-8 md:p-10">
            
            {/* Header */}
            <div className="text-center mb-8 fade-in fade-in-1">
              <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-brand-light to-white rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-orange-100">
                <KeyRound size={32} className="text-brand-primary" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">
                Cambiar Contraseña
              </h1>
              <p className="text-sm text-slate-500">
                Ingresa tus datos para actualizar tu acceso
              </p>
            </div>

            {success ? (
              <div className="fade-in text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={32} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">¡Contraseña Actualizada!</h2>
                <p className="text-slate-500 text-sm mb-6">Tu contraseña se ha cambiado con éxito. Redirigiendo al login...</p>
                <Link to="/login" className="text-brand-primary font-medium hover:underline">
                  Volver al Login manualmente
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Email Input */}
                <div className="fade-in fade-in-2">
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
                      placeholder="admin@chikisdtv.com"
                      className="pl-10 relative z-0"
                      style={{
                        transition: 'all 0.3s ease',
                        borderColor: focusedField === 'email' ? '#f97316' : undefined,
                      }}
                    />
                  </div>
                </div>

                {/* Current Password Input */}
                <div className="fade-in fade-in-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña Actual</label>
                  <div className="relative input-focus">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      onFocus={() => setFocusedField('currentPassword')}
                      onBlur={() => setFocusedField(null)}
                      required
                      placeholder="••••••••"
                      className="pl-10 pr-10 relative z-0"
                      style={{
                        transition: 'all 0.3s ease',
                        borderColor: focusedField === 'currentPassword' ? '#f97316' : undefined,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-primary focus:outline-none z-10 transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* New Password Input */}
                <div className="fade-in fade-in-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
                  <div className="relative input-focus">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onFocus={() => setFocusedField('newPassword')}
                      onBlur={() => setFocusedField(null)}
                      required
                      placeholder="Mínimo 6 caracteres"
                      className="pl-10 pr-10 relative z-0"
                      style={{
                        transition: 'all 0.3s ease',
                        borderColor: focusedField === 'newPassword' ? '#f97316' : undefined,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-primary focus:outline-none z-10 transition-colors"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="fade-in fade-in-5">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Contraseña</label>
                  <div className="relative input-focus">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                      required
                      placeholder="Mínimo 6 caracteres"
                      className="pl-10 pr-10 relative z-0"
                      style={{
                        transition: 'all 0.3s ease',
                        borderColor: focusedField === 'confirmPassword' ? '#f97316' : undefined,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-primary focus:outline-none z-10 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Error State */}
                {error && (
                  <div className="fade-in error-pulse bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 text-sm p-4 rounded-lg flex items-start gap-3">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <p className="font-medium">{error}</p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="fade-in fade-in-5 button-hover w-full py-3 px-4 bg-gradient-to-r from-brand-primary to-blue-600 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-80 disabled:cursor-not-allowed mt-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      <span>Actualizar Contraseña</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer / Back Link */}
            {!success && (
              <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center justify-center fade-in fade-in-5">
                <Link to="/login" className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-primary transition-colors">
                  <ArrowLeft size={16} />
                  <span>Volver al inicio de sesión</span>
                </Link>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </>
  )
}
