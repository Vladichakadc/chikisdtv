// Caché en memoria para los indicadores del Dashboard.
//
// Los cálculos recorren varias tablas completas; los datos solo cambian cuando
// alguien registra o edita algo. Por eso cada indicador se guarda unos segundos
// y TODA la caché se borra apenas la API recibe una escritura exitosa
// (POST/PUT/PATCH/DELETE en /api/admin): el Dashboard nunca muestra una venta
// o una renovación con retraso.
const TTL_MS = 60 * 1000;
const entradas = new Map();

async function enCache(clave, calcular, ttlMs = TTL_MS) {
  const e = entradas.get(clave);
  if (e && Date.now() < e.vence) return e.valor;
  // Comparte el cálculo en curso entre peticiones simultáneas
  if (e?.pendiente) return e.pendiente;
  const pendiente = Promise.resolve().then(calcular);
  entradas.set(clave, { pendiente, vence: 0 });
  try {
    const valor = await pendiente;
    if (entradas.get(clave)?.pendiente === pendiente) entradas.set(clave, { valor, vence: Date.now() + ttlMs });
    return valor;
  } catch (err) {
    entradas.delete(clave);
    throw err;
  }
}

function invalidarCache() { entradas.clear(); }

// Middleware: invalida la caché después de cada escritura exitosa
function invalidarTrasEscritura(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    res.on('finish', () => { if (res.statusCode < 400) invalidarCache(); });
  }
  next();
}

module.exports = { enCache, invalidarCache, invalidarTrasEscritura, TTL_MS };
