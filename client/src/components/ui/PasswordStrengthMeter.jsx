import React from 'react'

export function PasswordStrengthMeter({ password }) {
  // Función para evaluar la contraseña
  const getStrength = (pass) => {
    let score = 0
    if (!pass) return { score: 0, label: '', color: 'bg-gray-200' }
    
    if (pass.length > 5) score += 1
    if (pass.length > 8) score += 1
    if (/[A-Z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass)) score += 1
    if (/[^A-Za-z0-9]/.test(pass)) score += 1

    if (score <= 2) return { score, label: 'Débil', color: 'bg-red-400' }
    if (score === 3 || score === 4) return { score, label: 'Buena', color: 'bg-yellow-400' }
    return { score, label: 'Fuerte', color: 'bg-green-500' }
  }

  const { score, label, color } = getStrength(password)

  // Crear 4 segmentos visuales
  const renderSegment = (index) => {
    // Si la contraseña está vacía, gris
    if (!password) return 'bg-gray-200'
    // Los segmentos se colorean según el score.
    // Ej: Débil (score <=2) colorea 1 o 2 segmentos de rojo.
    // Buena (score 3-4) colorea 3 segmentos de amarillo.
    // Fuerte (score >=5) colorea 4 segmentos de verde.
    let activeSegments = 0
    if (score <= 2) activeSegments = score || 1
    else if (score <= 4) activeSegments = 3
    else activeSegments = 4

    return index < activeSegments ? color : 'bg-gray-200'
  }

  if (!password) return null

  return (
    <div className="mt-2 flex flex-col gap-1.5 fade-in">
      <div className="flex gap-1 h-1.5 w-full">
        <div className={`flex-1 rounded-full transition-colors duration-300 ${renderSegment(0)}`} />
        <div className={`flex-1 rounded-full transition-colors duration-300 ${renderSegment(1)}`} />
        <div className={`flex-1 rounded-full transition-colors duration-300 ${renderSegment(2)}`} />
        <div className={`flex-1 rounded-full transition-colors duration-300 ${renderSegment(3)}`} />
      </div>
      <div className="text-right">
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
    </div>
  )
}
