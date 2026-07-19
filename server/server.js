// Zona horaria Colombia — debe preceder a cualquier operación de fecha
process.env.TZ = 'America/Bogota';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const path = require('path');
const sequelize = require('./config/database');
const { Client, Plan, CostoPantalla } = require('./models');
const { withRLS } = require('./middleware/rlsContext');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { autoFixCuentaIdMismatches } = require('./services/planificadorImportService');
const { ensureVentasEquiposSchema } = require('./utils/ensureVentasEquiposSchema');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(withRLS);

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'ChikisdTV', time: new Date().toISOString() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'ChikisdTV', time: new Date().toISOString() }));

const userRoutes = require('./routes/user');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

// Sirve el frontend en producción.
// Doble condición: NODE_ENV=production O la carpeta dist existe (Railway no siempre
// inyecta NODE_ENV aunque sí construya el frontend).
const distPath = path.join(__dirname, '..', 'client', 'dist');
const serveStatic = process.env.NODE_ENV === 'production' ||
  (function() { try { require('fs').accessSync(distPath); return true; } catch { return false; } })();

if (serveStatic) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function seedAdminAndPlans() {
  const adminExists = await Client.findOne({ where: { email: 'admin@chikisdtv.com' } });
  if (!adminExists) {
    const hashed = await bcrypt.hash('admin123', 10);
    await Client.create({
      name: 'Administrador',
      email: 'admin@chikisdtv.com',
      password: hashed,
      role: 'admin',
      estatus: 'Activo',
      customerId: 'ADMIN001'
    });
    console.log('[SEED] Admin creado: admin@chikisdtv.com / admin123');
  }

  const planCount = await Plan.count();
  if (planCount === 0) {
    await Plan.bulkCreate([
      { nombre: '1 Pantalla', precio: 8000, duracionDias: 30, numeroPantallas: 1, descripcion: 'Plan mensual 1 pantalla', activo: true },
      { nombre: '2 Pantallas', precio: 12000, duracionDias: 30, numeroPantallas: 2, descripcion: 'Plan mensual 2 pantallas', activo: true },
      { nombre: '3 Pantallas', precio: 16000, duracionDias: 30, numeroPantallas: 3, descripcion: 'Plan mensual 3 pantallas', activo: true },
      { nombre: 'Anual 1 Pantalla', precio: 80000, duracionDias: 365, numeroPantallas: 1, descripcion: 'Plan anual 1 pantalla', activo: true }
    ]);
    console.log('[SEED] Planes iniciales creados');
  }
}

async function seedDevicesFromVentas() {
  const { VentaEquipo, Client, Device } = require('./models');
  const { Op } = require('sequelize');

  const count = await Device.count();
  if (count > 0) return; // Si ya hay dispositivos, no migramos para no duplicar

  console.log('[SEED] Buscando equipos históricos en Ventas Equipos para poblar Inventario...');
  const ventasEquipos = await VentaEquipo.findAll();

  let creados = 0;
  for (const v of ventasEquipos) {
    if (!v.customerId) continue;
    const client = await Client.findOne({ where: { customerId: v.customerId } });
    if (!client) continue;

    const macOId = v.idPantalla || v.nickname || `HIST-${v.idVM}`;
    
    // Helper function duplicate from ventasLicencia to map tipo
    let tipoMapeado = 'Otro';
    const t = (v.tipoFire || '').toLowerCase();
    if (t.includes('tv') || t.includes('fire') || t.includes('onn') || t.includes('stick') || t.includes('cube') || t.includes('pantalla')) tipoMapeado = 'Smart TV';
    else if (t.includes('pc') || t.includes('computador')) tipoMapeado = 'PC';
    else if (t.includes('celular') || t.includes('phone')) tipoMapeado = 'Celular';
    else if (t.includes('tablet')) tipoMapeado = 'Tablet';

    await Device.findOrCreate({
      where: { mac: macOId },
      defaults: {
        clientId: client.id,
        nombre: v.nickname || v.idPantalla || `Equipo ${v.idVM}`,
        tipo: tipoMapeado,
        mac: macOId,
        activo: v.estado !== 'Desactivado' && v.estado !== 'Baja'
      }
    });
    creados++;
  }
  if (creados > 0) console.log(`[SEED] Se migraron ${creados} dispositivos históricos al Inventario.`);
}

(async () => {
  try {
    await sequelize.authenticate();
    console.log('[DB] Conexión SQLite establecida');
    await sequelize.query('PRAGMA foreign_keys = ON');
    // WAL permite lecturas concurrentes mientras hay una escritura en curso
    // (imports de Excel, ediciones del planificador) sin bloquear el dashboard.
    await sequelize.query('PRAGMA journal_mode = WAL');
    await sequelize.query('PRAGMA synchronous = NORMAL');
    await sequelize.sync();
    // costo_pantalla recibió columnas nuevas después de su creación inicial;
    // alter:true agrega las que falten. Se corre una sola vez al arranque
    // (antes se ejecutaba en cada GET /payments/costo-pantalla).
    await CostoPantalla.sync({ alter: true });
    // ventas_equipos también ganó columnas tarde (costo, serial, garantia):
    // ALTER dirigido e idempotente — debe correr ANTES de seedDevicesFromVentas,
    // que hace el primer SELECT del modelo y falla si falta alguna columna.
    await ensureVentasEquiposSchema();
    console.log('[DB] Tablas sincronizadas');
    await seedAdminAndPlans();
    await seedDevicesFromVentas();
    // Self-healing: corrige desalineamientos cuentaId/idPantalla en cada arranque,
    // garantizando que producción quede sana sin necesidad de scripts manuales.
    await autoFixCuentaIdMismatches();

    // Guarda referencia al servidor para graceful shutdown
    const server = app.listen(PORT, () => {
      console.log(`[CHIKISDTV] Servidor corriendo en http://localhost:${PORT}`);
    });

    // Graceful shutdown — Railway envía SIGTERM antes de redeployar.
    // Sin este handler, npm lo interpreta como error aunque el proceso haya
    // arrancado y respondido correctamente.
    const shutdown = (signal) => {
      console.log(`[CHIKISDTV] ${signal} recibido — cerrando servidor...`);
      server.close(() => {
        console.log('[CHIKISDTV] Servidor cerrado limpiamente.');
        process.exit(0);
      });
      setTimeout(() => process.exit(0), 10000); // fuerza salida tras 10 s
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    console.error('[STARTUP ERROR]', err);
    process.exit(1);
  }
})();
