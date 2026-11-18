// Cifrado de contraseñas de cuentas padre en reposo (AES-256-GCM).
//
// La clave sale de CREDENCIALES_KEY (variable de entorno de Railway y de
// server/.env en local). Cualquier texto sirve: se deriva con SHA-256 a 32
// bytes. Formato guardado: "enc:v1:<iv>:<tag>:<datos>" (base64url).
//
// Sin clave la app sigue funcionando y guarda en texto plano (con aviso), y
// los valores ya cifrados no se pueden leer: por eso la clave NO se debe
// perder ni cambiar. descifrar() acepta texto plano para migrar sin cortes.
const crypto = require('crypto');

const PREFIJO = 'enc:v1:';
let avisado = false;

function clave() {
  const k = process.env.CREDENCIALES_KEY;
  if (!k) {
    if (!avisado) {
      avisado = true;
      console.warn('[CIFRADO] CREDENCIALES_KEY no está definida: las contraseñas de cuentas padre se guardan SIN cifrar.');
    }
    return null;
  }
  return crypto.createHash('sha256').update(String(k)).digest();
}

const estaCifrado = (v) => typeof v === 'string' && v.startsWith(PREFIJO);

function cifrar(texto) {
  if (texto == null || texto === '' || estaCifrado(texto)) return texto;
  const k = clave();
  if (!k) return texto;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', k, iv);
  const datos = Buffer.concat([c.update(String(texto), 'utf8'), c.final()]);
  return PREFIJO + [iv, c.getAuthTag(), datos].map(b => b.toString('base64url')).join(':');
}

function descifrar(valor) {
  if (!estaCifrado(valor)) return valor;
  const k = clave();
  if (!k) return null; // cifrado pero sin clave: no hay forma de leerlo
  try {
    const [iv, tag, datos] = valor.slice(PREFIJO.length).split(':').map(s => Buffer.from(s, 'base64url'));
    const d = crypto.createDecipheriv('aes-256-gcm', k, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(datos), d.final()]).toString('utf8');
  } catch (e) {
    console.error('[CIFRADO] No se pudo descifrar una contraseña (¿cambió CREDENCIALES_KEY?):', e.message);
    return null;
  }
}

const cifradoActivo = () => !!process.env.CREDENCIALES_KEY;

module.exports = { cifrar, descifrar, estaCifrado, cifradoActivo, PREFIJO };
