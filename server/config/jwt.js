// JWT_SECRET es obligatorio: si no está configurado, fallar al arrancar en vez de
// firmar/verificar tokens con un secreto por defecto presente en el código fuente.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está definido. Configúralo en server/.env antes de iniciar la aplicación.');
}

module.exports = JWT_SECRET;
