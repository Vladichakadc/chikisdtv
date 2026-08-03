// Única fuente de verdad para la fortaleza de contraseña — usada por
// ChangePasswordPage y PasswordStrengthMeter (antes cada una tenía su propia
// escala y daba una etiqueta distinta para la misma contraseña).
const LEVELS = [
  { label: '',           color: '#44445a' },
  { label: 'Débil',      color: '#ef4444' },
  { label: 'Regular',    color: '#f59e0b' },
  { label: 'Buena',      color: '#10b981' },
  { label: 'Fuerte 🔒',  color: '#06b6d4' },
]

export function evaluatePasswordStrength(pass) {
  if (!pass) return { score: 0, label: '', color: LEVELS[0].color, reqs: [] }
  const reqs = [
    { label: 'Mín. 8 caracteres', ok: pass.length >= 8 },
    { label: 'Mayúscula (A–Z)',   ok: /[A-Z]/.test(pass) },
    { label: 'Número (0–9)',      ok: /[0-9]/.test(pass) },
    { label: 'Símbolo (!@#…)',    ok: /[^A-Za-z0-9]/.test(pass) },
  ]
  const score = reqs.filter(r => r.ok).length
  return { score, ...LEVELS[score], reqs }
}
