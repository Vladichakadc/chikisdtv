import React from 'react'
import { evaluatePasswordStrength } from '../../utils/passwordStrength'

const BAR_COLORS = ['bg-gray-200', 'bg-red-400', 'bg-amber-400', 'bg-green-500', 'bg-cyan-500']

export function PasswordStrengthMeter({ password }) {
  if (!password) return null

  const { score, label } = evaluatePasswordStrength(password)
  const activeColor = BAR_COLORS[score] || 'bg-gray-200'

  return (
    <div className="mt-2 flex flex-col gap-1.5 fade-in">
      <div className="flex gap-1 h-1.5 w-full">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-colors duration-300 ${i <= score ? activeColor : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <div className="text-right">
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
    </div>
  )
}
