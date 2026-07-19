const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Client } = require('../models');

const JWT_SECRET = require('../config/jwt');
const rateLimit = require('express-rate-limit');

// Rate limiter para prevención de fuerza bruta (VibeSec / OWASP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos por IP
  message: { error: 'Demasiados intentos fallidos. Por favor, inténtalo de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const client = await Client.findOne({ where: { email } });
    if (!client) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const valid = await bcrypt.compare(password, client.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    if (client.estatus === 'Inactivo') return res.status(403).json({ error: 'Cuenta inactiva' });


    let mustChangePassword = client.mustChangePassword;
    if (client.role === 'admin' && client.passwordLastChanged) {
      const daysSinceChange = (new Date() - new Date(client.passwordLastChanged)) / (1000 * 60 * 60 * 24);
      if (daysSinceChange >= 90) {
        mustChangePassword = true;
      }
    }

    const token = jwt.sign(
      { id: client.id, role: client.role, name: client.name, email: client.email, customerId: client.customerId, mustChangePassword },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, role: client.role, name: client.name, mustChangePassword });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    const jwt2 = require('jsonwebtoken');
    const decoded = jwt2.verify(token, JWT_SECRET);

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await Client.update({ password: hashed, mustChangePassword: false, passwordLastChanged: new Date() }, { where: { id: decoded.id } });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/public-change-password
router.post('/public-change-password', authLimiter, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const client = await Client.findOne({ where: { email } });
    if (!client) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const valid = await bcrypt.compare(currentPassword, client.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await Client.update({ password: hashed, mustChangePassword: false, passwordLastChanged: new Date() }, { where: { id: client.id } });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
