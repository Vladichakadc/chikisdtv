/**
 * Script de análisis: Valida la tabla devices y venta de dispositivos
 */
const path = require('path');

// Usar sqlite3 directamente (disponible en el proyecto)
const sqlite3 = require(path.join(__dirname, 'server', 'node_modules', 'sqlite3'));

const DB_PATH = path.join(__dirname, 'database.sqlite');

function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function runGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function analyze() {
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);
  
  console.log('\n========================================');
  console.log('  ANÁLISIS: DISPOSITIVOS & VENTA');
  console.log('========================================\n');

  // ===== 1. TABLAS EXISTENTES =====
  console.log('=== 1. TABLAS EN LA BASE DE DATOS ===');
  const tables = await runQuery(db, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  tables.forEach(t => console.log('  -', t.name));

  // ===== 2. TABLA DEVICES =====
  console.log('\n=== 2. SCHEMA DE LA TABLA devices ===');
  const devSchema = await runQuery(db, "PRAGMA table_info(devices)");
  devSchema.forEach(c => console.log(`  ${c.name} (${c.type}) ${c.notnull ? 'NOT NULL' : ''} ${c.dflt_value ? 'DEFAULT: '+c.dflt_value : ''}`));

  console.log('\n=== 3. ESTADÍSTICAS DE DEVICES ===');
  const devTotal = await runGet(db, 'SELECT COUNT(*) as total FROM devices');
  const devActivos = await runGet(db, "SELECT COUNT(*) as total FROM devices WHERE activo=1");
  const devInactivos = await runGet(db, "SELECT COUNT(*) as total FROM devices WHERE activo=0");
  const devSinCliente = await runGet(db, 'SELECT COUNT(*) as total FROM devices WHERE clientId IS NULL OR clientId=0');
  const devSinSub = await runGet(db, 'SELECT COUNT(*) as total FROM devices WHERE subscriptionId IS NULL');
  const devSinNombre = await runGet(db, "SELECT COUNT(*) as total FROM devices WHERE nombre IS NULL OR nombre=''");
  const devSinMac = await runGet(db, "SELECT COUNT(*) as total FROM devices WHERE mac IS NULL OR mac=''");
  
  console.log(`  Total registros: ${devTotal.total}`);
  console.log(`  Activos:         ${devActivos.total}`);
  console.log(`  Inactivos:       ${devInactivos.total}`);
  console.log(`  Sin clientId:    ${devSinCliente.total}`);
  console.log(`  Sin subscription:${devSinSub.total}`);
  console.log(`  Sin nombre:      ${devSinNombre.total}`);
  console.log(`  Sin MAC:         ${devSinMac.total}`);

  console.log('\n=== 4. DISTRIBUCIÓN POR TIPO ===');
  const devTipos = await runQuery(db, "SELECT tipo, COUNT(*) as total FROM devices GROUP BY tipo ORDER BY total DESC");
  devTipos.forEach(r => console.log(`  ${r.tipo || 'NULL'}: ${r.total}`));

  console.log('\n=== 5. INTEGRIDAD: devices vs clients ===');
  const orphanDevices = await runQuery(db, `
    SELECT d.id, d.clientId, d.nombre 
    FROM devices d 
    LEFT JOIN users c ON d.clientId = c.id 
    WHERE c.id IS NULL LIMIT 10
  `);
  console.log(`  Devices con clientId inválido (orphans): ${orphanDevices.length}`);
  orphanDevices.forEach(d => console.log(`    - Device #${d.id}: clientId=${d.clientId}, nombre="${d.nombre}"`));

  console.log('\n=== 6. INTEGRIDAD: devices vs subscriptions ===');
  const orphanDevSubs = await runQuery(db, `
    SELECT d.id, d.subscriptionId, d.nombre 
    FROM devices d 
    LEFT JOIN subscriptions s ON d.subscriptionId = s.id 
    WHERE d.subscriptionId IS NOT NULL AND s.id IS NULL LIMIT 10
  `);
  console.log(`  Devices con subscriptionId inválido: ${orphanDevSubs.length}`);
  orphanDevSubs.forEach(d => console.log(`    - Device #${d.id}: subscriptionId=${d.subscriptionId}, nombre="${d.nombre}"`));

  // ===== 3. TABLA VENTAS (FireTV) =====
  console.log('\n=== 7. TABLA ventas (Venta de Dispositivos FireTV) ===');
  const ventasSchema = await runQuery(db, "PRAGMA table_info(ventas)");
  console.log('  Columnas disponibles:');
  ventasSchema.forEach(c => console.log(`    ${c.name} (${c.type})`));

  console.log('\n=== 8. ESTADÍSTICAS DE VENTAS (FireTV) ===');
  const ventasTotal = await runGet(db, 'SELECT COUNT(*) as total FROM ventas');
  const ventasSinCustomer = await runGet(db, "SELECT COUNT(*) as total FROM ventas WHERE customerId IS NULL OR customerId=''");
  const ventasSinFecha = await runGet(db, 'SELECT COUNT(*) as total FROM ventas WHERE fecha IS NULL');
  const ventasSinPrecio = await runGet(db, 'SELECT COUNT(*) as total FROM ventas WHERE precioVenta IS NULL OR precioVenta=0');
  const ventasSinSku = await runGet(db, "SELECT COUNT(*) as total FROM ventas WHERE sku IS NULL OR sku=''");
  const ventasSinNombre = await runGet(db, "SELECT COUNT(*) as total FROM ventas WHERE nombre IS NULL OR nombre=''");
  
  console.log(`  Total registros:       ${ventasTotal.total}`);
  console.log(`  Sin customerId:        ${ventasSinCustomer.total}`);
  console.log(`  Sin fecha:             ${ventasSinFecha.total}`);
  console.log(`  Sin precioVenta:       ${ventasSinPrecio.total}`);
  console.log(`  Sin SKU:               ${ventasSinSku.total}`);
  console.log(`  Sin nombre:            ${ventasSinNombre.total}`);

  if (ventasTotal.total > 0) {
    console.log('\n=== 9. MUESTRA DE DATOS VENTAS (5 registros) ===');
    const ventasSample = await runQuery(db, 'SELECT * FROM ventas LIMIT 5');
    ventasSample.forEach((v, i) => {
      console.log(`  Registro ${i+1}:`, JSON.stringify(v, null, 4).substring(0, 400));
    });

    console.log('\n=== 10. DISTRIBUCIÓN POR AÑO/MES ===');
    const ventasPorAnio = await runQuery(db, 'SELECT anio, COUNT(*) as total FROM ventas GROUP BY anio ORDER BY anio DESC');
    ventasPorAnio.forEach(r => console.log(`  Año ${r.anio || 'NULL'}: ${r.total}`));

    console.log('\n=== 11. DISTRIBUCIÓN POR TIPO FIRE ===');
    const ventasTipoFire = await runQuery(db, "SELECT tipoFire, COUNT(*) as total FROM ventas GROUP BY tipoFire ORDER BY total DESC LIMIT 10");
    ventasTipoFire.forEach(r => console.log(`  ${r.tipoFire || 'NULL'}: ${r.total}`));

    console.log('\n=== 12. DISTRIBUCIÓN POR tipoPlan ===');
    const ventasPlan = await runQuery(db, "SELECT tipoPlan, COUNT(*) as total FROM ventas GROUP BY tipoPlan ORDER BY total DESC LIMIT 10");
    ventasPlan.forEach(r => console.log(`  ${r.tipoPlan || 'NULL'}: ${r.total}`));

    console.log('\n=== 13. INGRESOS TOTALES ===');
    const ingresos = await runGet(db, 'SELECT SUM(precioVenta) as total, AVG(precioVenta) as promedio, MIN(precioVenta) as minimo, MAX(precioVenta) as maximo FROM ventas');
    console.log(`  Total ingresos:  $${(ingresos.total || 0).toFixed(2)}`);
    console.log(`  Promedio venta:  $${(ingresos.promedio || 0).toFixed(2)}`);
    console.log(`  Mínimo:          $${(ingresos.minimo || 0).toFixed(2)}`);
    console.log(`  Máximo:          $${(ingresos.maximo || 0).toFixed(2)}`);
  } else {
    console.log('\n  ⚠️  La tabla ventas está VACÍA (0 registros)');
  }

  // ===== RELACIÓN entre ventas y clientes =====
  console.log('\n=== 14. ¿EXISTE RELACIÓN ventas -> clients? ===');
  const usersTable = await runQuery(db, "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users','clients','clientes')");
  console.log('  Tablas de usuarios encontradas:', usersTable.map(t => t.name).join(', ') || 'NINGUNA');

  if (ventasTotal.total > 0) {
    const ventasConCliente = await runQuery(db, `
      SELECT v.customerId, v.nombre, v.apellido, v.cuenta 
      FROM ventas v LIMIT 5
    `);
    console.log('\n  Muestra relación customerId - nombre en ventas:');
    ventasConCliente.forEach(v => console.log(`    customerId="${v.customerId}" | nombre="${v.nombre} ${v.apellido}" | cuenta="${v.cuenta}"`));
  }

  console.log('\n=== 15. DIAGNÓSTICO DEL MENÚ Dispositivos ===');
  console.log('  El menú "Dispositivos" usa el endpoint GET /admin/devices');
  console.log('  Que consulta la tabla "devices" con JOIN a users y subscriptions');
  console.log('  La sección "Venta de Dispositivos" usa datos de la tabla "ventas"');
  console.log(`\n  RESUMEN:`);
  console.log(`  - devices tiene ${devTotal.total} registros`);
  console.log(`  - ventas tiene ${ventasTotal.total} registros`);
  
  db.close();
  console.log('\n========================================');
  console.log('  ANÁLISIS COMPLETADO');
  console.log('========================================\n');
}

analyze().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
