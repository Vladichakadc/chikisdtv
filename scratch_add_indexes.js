// Aplica los índices recomendados en el análisis de performance (DBA review),
// activa journal_mode=WAL y corre ANALYZE para refrescar las estadísticas
// del planificador de consultas de SQLite. Idempotente: usa
// "CREATE INDEX IF NOT EXISTS", se puede correr varias veces sin riesgo.
//
// Uso: node scratch_add_indexes.js   (desde la raíz del repo)

const path = require('path');
const sequelize = require(path.join(__dirname, 'server', 'config', 'database'));

const INDEX_STATEMENTS = [
  // payments — FKs para JOINs, estado para sum()/count() del dashboard,
  // fechaPago para el ORDER BY de /payments
  "CREATE INDEX IF NOT EXISTS idx_payments_clientId ON payments(clientId)",
  "CREATE INDEX IF NOT EXISTS idx_payments_subscriptionId ON payments(subscriptionId)",
  "CREATE INDEX IF NOT EXISTS idx_payments_estado ON payments(estado)",
  "CREATE INDEX IF NOT EXISTS idx_payments_fechaPago ON payments(fechaPago)",

  // subscriptions — FKs y filtro compuesto estado+fechaVencimiento
  // (dashboard-stats: vencimientos próximos; dashboard-bi: churn)
  "CREATE INDEX IF NOT EXISTS idx_subscriptions_clientId ON subscriptions(clientId)",
  "CREATE INDEX IF NOT EXISTS idx_subscriptions_planId ON subscriptions(planId)",
  "CREATE INDEX IF NOT EXISTS idx_subscriptions_estado_venc ON subscriptions(estado, fechaVencimiento)",

  // devices — FKs y el UNIQUE de mac que el modelo declara pero que nunca
  // se materializó en la tabla existente (sync() sin alter)
  "CREATE INDEX IF NOT EXISTS idx_devices_clientId ON devices(clientId)",
  "CREATE INDEX IF NOT EXISTS idx_devices_subscriptionId ON devices(subscriptionId)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_mac ON devices(mac)",

  // bajas — FK a clients y anio para los agregados de churn por año
  "CREATE INDEX IF NOT EXISTS idx_bajas_clientId ON bajas(clientId)",
  "CREATE INDEX IF NOT EXISTS idx_bajas_anio ON bajas(anio)",

  // ventas — anio+mes para series de tiempo (BI), customerId para LTV/Pareto,
  // tipoPago para el desglose por tipo de pago y el filtro de /ventas-dispositivos
  "CREATE INDEX IF NOT EXISTS idx_ventas_anio_mes ON ventas(anio, mes)",
  "CREATE INDEX IF NOT EXISTS idx_ventas_customerId ON ventas(customerId)",
  "CREATE INDEX IF NOT EXISTS idx_ventas_tipoPago ON ventas(tipoPago)",

  // planificador — cuentaId se usa para ORDER BY, agrupaciones de ocupación
  // y el bucle de sync-cuentas-padre
  "CREATE INDEX IF NOT EXISTS idx_planificador_cuentaId ON planificador(cuentaId)",

  // tabla_clientes — agregaciones por tipo de cliente y país
  "CREATE INDEX IF NOT EXISTS idx_tabla_clientes_tipo ON tabla_clientes(tipoCliente)",
  "CREATE INDEX IF NOT EXISTS idx_tabla_clientes_pais ON tabla_clientes(pais)",
];

(async () => {
  try {
    await sequelize.authenticate();

    console.log('📐 Creando índices...');
    for (const sql of INDEX_STATEMENTS) {
      try {
        await sequelize.query(sql);
        console.log(`  ✅ ${sql}`);
      } catch (err) {
        console.error(`  ❌ ${sql}\n     -> ${err.message}`);
      }
    }

    console.log('\n🗂️  Activando journal_mode=WAL...');
    const [wal] = await sequelize.query('PRAGMA journal_mode=WAL');
    console.log('  ', JSON.stringify(wal));

    console.log('\n📊 Ejecutando ANALYZE (refresca estadísticas del query planner)...');
    await sequelize.query('ANALYZE');
    console.log('  ✅ ANALYZE completado');

    console.log('\n🎉 Listo. Índices y configuración aplicados sobre database.sqlite.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
