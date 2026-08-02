import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Peticiones de fondo (polling/auto-refresh, ej. DashboardHome cada 60s o
      // al recuperar el foco de la pestaña) se marcan `silent: true` en su config.
      // Un token vencido/ausente en ESE instante no debe cerrar la sesión de golpe
      // — eso es lo que hacía que un modal se cerrara "de la nada" mientras el
      // usuario estaba en otra pestaña. Solo una petición real (iniciada por el
      // usuario) puede disparar el cierre de sesión.
      if (err.config?.silent) return Promise.reject(err)

      localStorage.removeItem('token')
      localStorage.removeItem('role')
      if (!window.location.pathname.startsWith('/login')) {
        // Mensaje para que Login.jsx explique el redirect en vez de que el
        // usuario simplemente "aparezca" en la pantalla de login sin contexto.
        sessionStorage.setItem('sessionExpiredMessage', 'Tu sesión expiró — inicia sesión de nuevo.')
        window.location.href = '/login'
      }
    } else if (err.response?.status === 403 && err.response?.data?.mustChangePassword) {
      if (!window.location.pathname.startsWith('/change-password')) {
        window.location.href = '/change-password'
      }
    }
    return Promise.reject(err)
  }
)

export default api
