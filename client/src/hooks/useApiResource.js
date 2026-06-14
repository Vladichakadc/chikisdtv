import { useState, useEffect, useCallback } from 'react'
import api from '../config/api'

// Encapsula el patrón repetido en las páginas admin: pedir un recurso a la API,
// llevar estado de loading/error y exponer una función de recarga.
// `transform` permite adaptar la respuesta cruda antes de guardarla (ej. filtrar por rol).
export function useApiResource(url, { initialData = [], transform } = {}) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data: raw } = await api.get(url)
      setData(transform ? transform(raw) : raw)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => { load() }, [load])

  return { data, setData, loading, error, reload: load }
}
