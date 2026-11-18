// Países e indicativos telefónicos. Fuente única para el formulario de
// Clientes (prefijo del móvil) y para armar el número de WhatsApp de los
// recordatorios. Los nombres alternativos cubren cómo vienen escritos en la
// Tabla de Clientes (p. ej. "Holanda", "Inglaterra", "Mexico" sin tilde).
export const PAISES = [
  { nombre: 'Colombia', codigo: '+57' }, { nombre: 'México', codigo: '+52', alias: ['Mexico'] },
  { nombre: 'Venezuela', codigo: '+58' }, { nombre: 'Ecuador', codigo: '+593' },
  { nombre: 'Perú', codigo: '+51' }, { nombre: 'Chile', codigo: '+56' },
  { nombre: 'Argentina', codigo: '+54' }, { nombre: 'Bolivia', codigo: '+591' },
  { nombre: 'Paraguay', codigo: '+595' }, { nombre: 'Uruguay', codigo: '+598' },
  { nombre: 'Brasil', codigo: '+55' }, { nombre: 'Panamá', codigo: '+507' },
  { nombre: 'Costa Rica', codigo: '+506' }, { nombre: 'Guatemala', codigo: '+502' },
  { nombre: 'Honduras', codigo: '+504' }, { nombre: 'El Salvador', codigo: '+503' },
  { nombre: 'Nicaragua', codigo: '+505' }, { nombre: 'República Dominicana', codigo: '+1' },
  { nombre: 'Puerto Rico', codigo: '+1' }, { nombre: 'Cuba', codigo: '+53' },
  { nombre: 'España', codigo: '+34' }, { nombre: 'Estados Unidos', codigo: '+1', alias: ['USA', 'EEUU', 'EE. UU.'] },
  { nombre: 'Canadá', codigo: '+1' },
  { nombre: 'Países Bajos', codigo: '+31', alias: ['Holanda'] },
  { nombre: 'Reino Unido', codigo: '+44', alias: ['Inglaterra'] },
  { nombre: 'Malta', codigo: '+356', alias: ['Republica de Malta', 'República de Malta'] },
  { nombre: 'Alemania', codigo: '+49' }, { nombre: 'Francia', codigo: '+33' },
  { nombre: 'Italia', codigo: '+39' }, { nombre: 'Portugal', codigo: '+351' },
]

const normalizarNombre = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim().toLowerCase()

const POR_NOMBRE = new Map()
for (const p of PAISES) {
  for (const n of [p.nombre, ...(p.alias || [])]) POR_NOMBRE.set(normalizarNombre(n), p)
}

// Indicativo en dígitos ("57") del país, o null si no se reconoce
export function indicativoDe(pais) {
  const p = POR_NOMBRE.get(normalizarNombre(pais))
  return p ? p.codigo.replace(/\D/g, '') : null
}
