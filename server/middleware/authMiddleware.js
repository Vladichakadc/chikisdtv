const jwt = require('jsonwebtoken');

const JWT_SECRET = require('../config/jwt');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    const { getRLSContext } = require('./rlsContext');
    const store = getRLSContext();
    if (store) store.set('user', decoded);
    
    next();
  } catch {
    // 401 (no 403): un token inválido/vencido es una falla de AUTENTICACIÓN
    // ("¿quién eres?"), no de autorización ("no tienes permiso"). El interceptor
    // del frontend (client/src/config/api.js) solo reacciona a 401 para cerrar
    // sesión — con 403 esto quedaba "roto en silencio" 8h después del login
    // (el usuario veía errores genéricos en cada acción, sin volver a /login).
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  };
}

function requireFreshPassword(req, res, next) {
  if (req.user?.mustChangePassword) {
    return res.status(403).json({ error: 'Debes cambiar tu contraseña antes de continuar', mustChangePassword: true });
  }
  next();
}

module.exports = { verifyToken, requireRole, requireFreshPassword };
