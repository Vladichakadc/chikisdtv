import { useEffect, useState } from 'react'

// true en pantallas angostas (por defecto < 640 px, el breakpoint `sm` de
// Tailwind). Se usa donde CSS no alcanza, p. ej. props de los gráficos.
export function useEsMovil(maxAncho = 639) {
  const consulta = `(max-width: ${maxAncho}px)`
  const [esMovil, setEsMovil] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(consulta).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(consulta)
    if (!mq) return undefined
    const cambio = (e) => setEsMovil(e.matches)
    setEsMovil(mq.matches)
    mq.addEventListener?.('change', cambio)
    return () => mq.removeEventListener?.('change', cambio)
  }, [consulta])
  return esMovil
}
