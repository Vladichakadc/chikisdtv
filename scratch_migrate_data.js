/**
 * Script de Migración de Datos - ChikisdTV
 * ==========================================
 * 
 * Lee los archivos Excel de la carpeta Tablas/ y migra los datos
 * a la base de datos SQLite.
 * 
 * USO: cd c:\ChikisdTV && node scratch_migrate_data.js
 * 
 * Modos:
 *   --analyze   Solo muestra las columnas de cada Excel (por defecto)
 *   --migrate   Ejecuta la migración real
 *   --dry-run   Simula la migración sin escribir en la BD
 */

const path = require('path');
const XLSX = require(path.join(__dirname, 'server', 'node_modules', 'xlsx'));
const sequelize = require('./server/config/database');
const bcrypt = require(path.join(__dirname, 'server', 'node_modules', 'bcryptjs'));
const { Client, Plan, Subscription, Payment, Device } = require('./server/models');

const TABLAS_DIR = path.join(__dirname, 'Tablas');

const mode = process.argv.includes('--migrate') ? 'migrate' 
           : process.argv.includes('--dry-run') ? 'dry-run' 
           : 'analyze';

// ============ UTILIDADES ============

function readExcel(filename) {
  const filepath = path.join(TABLAS_DIR, filename);
  try {
    const wb = XLSX.readFile(filepath);
    const sheets = {};
    wb.SheetNames.forEach(name => {
      sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null });
    });
    return sheets;
  } catch (e) {
    console.error(`  ❌ Error leyendo ${filename}: ${e.message}`);
    return null;
  }
}

function analyzeExcel(filename) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 ${filename}`);
  console.log('='.repeat(60));
  
  const sheets = readExcel(filename);
  if (!sheets) return null;

  Object.entries(sheets).forEach(([sheetName, rows]) => {
    console.log(`\n  📋 Hoja: "${sheetName}" (${rows.length} filas)`);
    
    if (rows.length === 0) {
      console.log('    (vacía)');
      return;
    }

    const cols = Object.keys(rows[0]);
    console.log(`  📊 Columnas (${cols.length}):`);
    cols.forEach(col => {
      // Analizar tipo de datos
      const sample = rows.find(r => r[col] !== null && r[col] !== undefined);
      const sampleVal = sample ? sample[col] : 'N/A';
      const type = sample ? typeof sampleVal : 'unknown';
      const nonNull = rows.filter(r => r[col] !== null && r[col] !== undefined && r[col] !== '').length;
      console.log(`    - ${col} [${type}] (${nonNull}/${rows.length} no-null) ejemplo: "${String(sampleVal).substring(0, 50)}"`);
    });

    // Mostrar primeras 3 filas
    console.log(`\n  🔍 Primeras 3 filas:`);
    rows.slice(0, 3).forEach((row, i) => {
      console.log(`    [${i}] ${JSON.stringify(row)}`);
    });
  });

  return sheets;
}

// ============ FASE 1: ANÁLISIS ============

async function analyzeAll() {
  console.log('\n' + '🔍'.repeat(30));
  console.log('  FASE 1: ANÁLISIS DE ARCHIVOS EXCEL');
  console.log('🔍'.repeat(30));

  const files = [
    'Tabla_Clientes.xlsx',
    'Tabla_Estado_Pantallas.xlsx',
    'Tabla_Costo_Pantalla.xlsx',
    'Tabla_Cuentaspadre.xlsx',
    'Tabla_inventario.xlsx',
    '1-orders_table_Ventas_LicenciaIPVT2024.xlsx',
    '1-orders_table_Ventas_Firetv2024.xlsx',
    '1-orders_table_Bajas_LicenciaIPTV.xlsx'
  ];

  const allData = {};
  for (const file of files) {
    allData[file] = analyzeExcel(file);
  }

  return allData;
}

// ============ FASE 2: ANÁLISIS DE BD ACTUAL ============

async function analyzeBD() {
  console.log('\n' + '🗄️'.repeat(30));
  console.log('  FASE 2: ESTADO ACTUAL DE LA BASE DE DATOS');
  console.log('🗄️'.repeat(30));

  await sequelize.authenticate();
  console.log('\n✅ Conexión SQLite establecida');

  const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log(`\n📋 Tablas existentes: ${tables.map(t => t.name).join(', ')}`);

  for (const t of tables) {
    if (t.name.startsWith('sqlite_')) continue;
    const [count] = await sequelize.query(`SELECT COUNT(*) as total FROM '${t.name}'`);
    console.log(`  ${t.name}: ${count[0].total} registros`);
    
    if (count[0].total > 0 && count[0].total <= 10) {
      const [rows] = await sequelize.query(`SELECT * FROM '${t.name}'`);
      rows.forEach(r => console.log(`    → ${JSON.stringify(r)}`));
    }
  }
}

// ============ FASE 3: MIGRACIÓN ============

async function migrateData(allData, isDryRun) {
  console.log('\n' + '🚀'.repeat(30));
  console.log(`  FASE 3: MIGRACIÓN DE DATOS ${isDryRun ? '(SIMULACIÓN)' : '(REAL)'}`);
  console.log('🚀'.repeat(30));

  const stats = {
    clients: { nuevos: 0, existentes: 0, errores: 0 },
    subscriptions: { nuevos: 0, errores: 0 },
    payments: { nuevos: 0, errores: 0 },
    devices: { nuevos: 0, errores: 0 }
  };

  // --- 3.1 Migrar Clientes ---
  console.log('\n--- 3.1 Migrando Clientes ---');
  const clientesData = allData['Tabla_Clientes.xlsx'];
  if (clientesData) {
    const firstSheet = Object.values(clientesData)[0];
    if (firstSheet && firstSheet.length > 0) {
      console.log(`  Encontrados ${firstSheet.length} clientes en Excel`);
      
      for (const row of firstSheet) {
        try {
          // Intentar mapear columnas (se adaptará según las columnas reales)
          const nombre = row.nombre || row.Nombre || row.NOMBRE || row.name || row.Name || row.cliente || row.Cliente || '';
          const email = row.email || row.Email || row.EMAIL || row.correo || row.Correo || '';
          const telefono = row.telefono || row.Telefono || row.TELEFONO || row.phone || row.Phone || row.celular || row.Celular || '';
          const cedula = row.cedula || row.Cedula || row.CEDULA || row.documento || row.Documento || row.cc || row.CC || '';
          const customerId = row.customerId || row.codigo || row.Codigo || row.CODIGO || row.id_cliente || row.ID || '';
          const estado = row.estado || row.Estado || row.ESTADO || row.estatus || row.Estatus || 'Activo';

          if (!nombre && !email) {
            console.log(`    ⚠️ Fila sin nombre ni email, saltando: ${JSON.stringify(row)}`);
            stats.clients.errores++;
            continue;
          }

          // Generar email si no tiene
          const finalEmail = email || `cliente_${customerId || cedula || Date.now()}@chikisdtv.local`;

          // Verificar si ya existe
          const existing = await Client.findOne({ 
            where: { 
              [require(path.join(__dirname, 'server', 'node_modules', 'sequelize')).Op.or]: [
                ...(finalEmail ? [{ email: finalEmail }] : []),
                ...(cedula ? [{ cedula: String(cedula) }] : [])
              ]
            }
          });

          if (existing) {
            console.log(`    ⏭️ Ya existe: ${nombre} (${finalEmail})`);
            stats.clients.existentes++;
            continue;
          }

          if (!isDryRun) {
            const hashed = await bcrypt.hash('123', 10);
            await Client.create({
              name: String(nombre).trim(),
              email: String(finalEmail).trim().toLowerCase(),
              phone: telefono ? String(telefono).trim() : null,
              cedula: cedula ? String(cedula).trim() : null,
              customerId: customerId ? String(customerId).trim() : null,
              password: hashed,
              role: 'user',
              estatus: String(estado).includes('Inactivo') ? 'Inactivo' : 'Activo',
              mustChangePassword: true,
              observaciones: 'Migrado desde Excel'
            });
          }
          console.log(`    ✅ ${isDryRun ? '[SIM]' : ''} Cliente: ${nombre} (${finalEmail})`);
          stats.clients.nuevos++;
        } catch (e) {
          console.log(`    ❌ Error: ${e.message}`);
          stats.clients.errores++;
        }
      }
    }
  }

  // --- 3.2 Migrar datos de suscripciones/pantallas ---
  console.log('\n--- 3.2 Migrando Estado de Pantallas (Suscripciones) ---');
  const pantallasData = allData['Tabla_Estado_Pantallas.xlsx'];
  if (pantallasData) {
    const firstSheet = Object.values(pantallasData)[0];
    if (firstSheet && firstSheet.length > 0) {
      console.log(`  Encontrados ${firstSheet.length} registros de pantallas`);
      
      for (const row of firstSheet) {
        try {
          // Intentar encontrar el cliente relacionado
          const clienteRef = row.cliente || row.Cliente || row.nombre || row.Nombre || row.name || '';
          const estado = row.estado || row.Estado || row.status || row.Status || 'Activo';
          const fechaInicio = row.fecha_inicio || row.FechaInicio || row.fecha || row.Fecha || null;
          const fechaVenc = row.fecha_vencimiento || row.FechaVencimiento || row.vencimiento || row.Vencimiento || null;

          console.log(`    📋 Pantalla: ${clienteRef} | Estado: ${estado} | Inicio: ${fechaInicio} | Venc: ${fechaVenc}`);
          stats.subscriptions.nuevos++;
        } catch (e) {
          console.log(`    ❌ Error: ${e.message}`);
          stats.subscriptions.errores++;
        }
      }
    }
  }

  // --- 3.3 Migrar Ventas (Pagos) ---
  console.log('\n--- 3.3 Migrando Ventas de Licencias IPTV 2024 ---');
  const ventasData = allData['1-orders_table_Ventas_LicenciaIPVT2024.xlsx'];
  if (ventasData) {
    const firstSheet = Object.values(ventasData)[0];
    if (firstSheet && firstSheet.length > 0) {
      console.log(`  Encontrados ${firstSheet.length} registros de ventas`);
      
      for (const row of firstSheet.slice(0, 5)) {
        console.log(`    📋 Venta: ${JSON.stringify(row)}`);
      }
      if (firstSheet.length > 5) {
        console.log(`    ... y ${firstSheet.length - 5} más`);
      }
      stats.payments.nuevos = firstSheet.length;
    }
  }

  // --- 3.4 Migrar Ventas Fire TV ---
  console.log('\n--- 3.4 Migrando Ventas Fire TV 2024 ---');
  const firetvData = allData['1-orders_table_Ventas_Firetv2024.xlsx'];
  if (firetvData) {
    const firstSheet = Object.values(firetvData)[0];
    if (firstSheet && firstSheet.length > 0) {
      console.log(`  Encontrados ${firstSheet.length} registros de ventas Fire TV`);
      
      for (const row of firstSheet.slice(0, 3)) {
        console.log(`    📋 Venta FireTV: ${JSON.stringify(row)}`);
      }
    }
  }

  // --- 3.5 Migrar Bajas ---
  console.log('\n--- 3.5 Migrando Bajas (Cancelaciones) ---');
  const bajasData = allData['1-orders_table_Bajas_LicenciaIPTV.xlsx'];
  if (bajasData) {
    const firstSheet = Object.values(bajasData)[0];
    if (firstSheet && firstSheet.length > 0) {
      console.log(`  Encontrados ${firstSheet.length} registros de bajas`);
      
      for (const row of firstSheet.slice(0, 3)) {
        console.log(`    📋 Baja: ${JSON.stringify(row)}`);
      }
    }
  }

  // --- Resumen ---
  console.log('\n' + '📊'.repeat(30));
  console.log('  RESUMEN DE MIGRACIÓN');
  console.log('📊'.repeat(30));
  console.log(`\n  Clientes:       ${stats.clients.nuevos} nuevos | ${stats.clients.existentes} ya existían | ${stats.clients.errores} errores`);
  console.log(`  Suscripciones:  ${stats.subscriptions.nuevos} registros encontrados | ${stats.subscriptions.errores} errores`);
  console.log(`  Pagos:          ${stats.payments.nuevos} registros encontrados | ${stats.payments.errores} errores`);
  console.log(`  Dispositivos:   ${stats.devices.nuevos} registros encontrados | ${stats.devices.errores} errores`);

  if (isDryRun || mode === 'analyze') {
    console.log('\n⚠️  Este fue un análisis/simulación. Para migrar realmente, ejecuta:');
    console.log('    node scratch_migrate_data.js --migrate');
  }
}

// ============ MAIN ============

(async () => {
  try {
    console.log('═'.repeat(60));
    console.log('  ChikisdTV - Script de Migración de Datos');
    console.log(`  Modo: ${mode.toUpperCase()}`);
    console.log(`  Fecha: ${new Date().toLocaleString('es-CO')}`);
    console.log('═'.repeat(60));

    // Conectar BD
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('✅ Base de datos conectada y sincronizada');

    // Fase 1: Analizar Excel
    const allData = await analyzeAll();

    // Fase 2: Analizar BD
    await analyzeBD();

    // Fase 3: Migrar (si no es solo análisis)
    if (mode === 'migrate' || mode === 'dry-run') {
      await migrateData(allData, mode === 'dry-run');
    } else {
      console.log('\n💡 Para simular la migración, ejecuta:');
      console.log('   node scratch_migrate_data.js --dry-run');
      console.log('\n💡 Para migrar realmente, ejecuta:');
      console.log('   node scratch_migrate_data.js --migrate');
    }

  } catch (e) {
    console.error('\n❌ ERROR FATAL:', e.message);
    console.error(e.stack);
  }
  process.exit(0);
})();
