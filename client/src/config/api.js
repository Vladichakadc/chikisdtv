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
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      if (!window.location.pathname.startsWith('/login')) {
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
