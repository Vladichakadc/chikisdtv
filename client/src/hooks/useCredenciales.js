// Contraseñas de cuentas padre bajo demanda. El Planificador ya no las recibe
// en sus cargas: se piden al backend solo cuando el admin decide verlas, y el
// backend deja constancia de quién las vio y para qué (motivo).
import { useCallback, useRef, useState } from 'react'
import api from '../config/api'
import { useUi } from '../context/UiContext'

export function useCredenciales() {
  const { showToast } = useUi()
  const [passwords, setPasswords] = useState({})
  const cache = useRef({})

  // Devuelve el mapa { idPantalla: password } incluyendo las pedidas, o null si falla
  const revelar = useCallback(async (ids, motivo) => {
    const faltan = [...new Set((ids || []).filter(Boolean))].filter(id => !(id in cache.current))
    if (!faltan.length) return cache.current
    try {
      const r = await api.post('/admin/planificador/credenciales', { idPantallas: faltan, motivo })
      cache.current = { ...cache.current, ...(r.data?.credenciales || {}) }
      setPasswords(cache.current)
      return cache.current
    } catch (e) {
      showToast(e.response?.data?.error || 'No se pudieron cargar las contraseñas.', 'error')
      return null
    }
  }, [showToast])

  // Descarta lo revelado (p. ej. tras recargar: las contraseñas pudieron cambiar)
  const olvidar = useCallback(() => { cache.current = {}; setPasswords({}) }, [])

  return { passwords, revelar, olvidar }
}
