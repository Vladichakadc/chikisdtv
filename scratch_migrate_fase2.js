/**
 * FASE 2 - Migración de Suscripciones, Pagos y Dispositivos
 * ===========================================================
 * 
 * Prerequisito: Haber ejecutado scratch_migrate_data.js --migrate (Fase 1 clientes)
 * 
 * USO:
 *   node scratch_migrate_fase2.js --analyze    (solo ver datos)
 *   node scratch_migrate_fase2.js --dry-run    (simular)
 *   node scratch_migrate_fase2.js --migrate    (migrar de verdad)
 */

const path = require('path');
const XLSX = require(path.join(__dirname, 'server', 'node_modules', 'xlsx'));
const { Op } = require(path.join(__dirname, 'server', 'node_modules', 'sequelize'));
const sequelize = require('./server/config/database');
const { Client, Plan, Subscription, Payment, Device } = require('./server/models');

const TABLAS_DIR = path.join(__dirname, 'Tablas');
const mode = process.argv.includes('--migrate') ? 'migrate'
           : process.argv.includes('--dry-run') ? 'dry-run'
           : 'analyze';

// ============ UTILIDADES ============

function readExcel(filename) {
  try {
    const wb = XLSX.readFile(path.join(TABLAS_DIR, filename));
    const firstSheet = wb.SheetNames[0];
    return XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: null });
  } catch (e) {
    console.error(`  ❌ Error leyendo ${filename}: ${e.message}`);
    return [];
  }
}

function printColumns(rows, label) {
  if (!rows || rows.length === 0) {
    console.log(`  ${label}: (vacío)`);
    return;
  }
  const cols = Object.keys(rows[0]);
  console.log(`\n  📄 ${label} (${rows.length} filas, ${cols.length} columnas)`);
  console.log(`  Columnas: ${cols.join(' | ')}`);
  console.log(`  Muestra fila 0: ${JSON.stringify(rows[0])}`);
  if (rows.length > 1) console.log(`  Muestra fila 1: ${JSON.stringify(rows[1])}`);
}

// Parsear fecha de Excel (puede ser número serial o string)
function parseExcelDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel serial date -> JS Date
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    // Intentar parsear varios formatos
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    // Formato DD/MM/YYYY
    const parts = val.split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
  }
  return null;
}

// Buscar cliente por Customer_id o nombre
async function findClient(customerId, nombre, apellido) {
  let client = null;
  
  // 1. Buscar por customerId
  if (customerId) {
    client = await Client.findOne({ where: { customerId: String(customerId).trim() } });
    if (client) return client;
  }
  
  // 2. Buscar por nombre
  const fullName = [nombre, apellido].filter(Boolean).join(' ').trim();
  if (fullName) {
    client = await Client.findOne({ 
      where: { name: { [Op.like]: `%${fullName}%` } }
    });
    if (client) return client;
    
    // 3. Buscar solo por primer nombre
    if (nombre) {
      client = await Client.findOne({ 
        where: { name: { [Op.like]: `${String(nombre).trim()}%` } }
      });
    }
  }
  
  return client;
}

// Mapear tipo de plan a planId
async function findPlan(tipoPlan, tipoPantalla, cantidad) {
  const plans = await Plan.findAll();
  
  if (!tipoPlan && !tipoPantalla) return plans[0]; // Default: primer plan
  
  const planStr = String(tipoPlan || '').toLowerCase();
  const pantallaStr = String(tipoPantalla || '').toLowerCase();
  
  // Buscar por número de pantallas si se menciona
  const numPantallas = cantidad || 1;
  
  // Buscar plan anual
  if (planStr.includes('anual') || planStr.includes('12') || planStr.includes('365')) {
    const anual = plans.find(p => p.duracionDias === 365 || p.nombre.toLowerCase().includes('anual'));
    if (anual) return anual;
  }
  
  // Buscar por semestral (6 meses)
  if (planStr.includes('semestral') || planStr.includes('6 meses') || planStr.includes('180')) {
    const semestral = plans.find(p => p.duracionDias === 180);
    if (semestral) return semestral;
  }
  
  // Buscar por número de pantallas
  const byPantallas = plans.find(p => p.numeroPantallas === numPantallas && p.duracionDias === 30);
  if (byPantallas) return byPantallas;
  
  // Default: 1 pantalla mensual
  return plans.find(p => p.numeroPantallas === 1 && p.duracionDias === 30) || plans[0];
}

// ============ MIGRAR ESTADO DE PANTALLAS -> SUSCRIPCIONES ============

async function migrateEstadoPantallas(isDryRun) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 MIGRANDO: Tabla_Estado_Pantallas.xlsx → subscriptions');
  console.log('='.repeat(60));

  const rows = readExcel('Tabla_Estado_Pantallas.xlsx');
  printColumns(rows, 'Estado Pantallas');
  
  if (mode === 'analyze' || rows.length === 0) return;

  let created = 0, skipped = 0, errors = 0;
  const cols = Object.keys(rows[0]);

  for (const row of rows) {
    try {
      // Extraer datos con nombres de columna flexibles
      const customerId = row.Customer_id || row.customer_id || row.CustomerId || row.Id || row.id_cliente || row.codigo || null;
      const nombre = row.Nombre || row.nombre || row.Name || row.Cliente || row.cliente || '';
      const apellido = row.Apellido || row.apellido || row.LastName || '';
      const estado = row.Estado || row.estado || row.Status || row.status || row.ESTADO || 'Activo';
      const tipoPlan = row['Tipo de Plan'] || row.tipo_plan || row.TipoPlan || row.Plan || row.plan || null;
      const tipoPantalla = row['Tipo de Pantalla'] || row.tipo_pantalla || row.TipoPantalla || null;
      const fechaInicio = row.Fecha_Inicio || row.fecha_inicio || row.FechaInicio || row.Fecha || row.fecha || row['Fecha Inicio'] || null;
      const fechaVenc = row.Fecha_Vencimiento || row.fecha_vencimiento || row.FechaVencimiento || row.Vencimiento || row['Fecha Vencimiento'] || null;
      const pantallas = row.Pantallas || row.pantallas || row.Cantidad || row.cantidad || row.Item_Quantity || 1;
      const observacion = row.Observaciones || row.observaciones || row.Notas || row.notas || '';
      const cuentaDedicada = row['Cuenta Dedicada'] || row.cuenta_dedicada || '';
      const revendedor = row.Revendedor || row.revendedor || '';

      // Buscar cliente
      const client = await findClient(customerId, nombre, apellido);
      if (!client) {
        console.log(`    ⚠️ Cliente no encontrado: ${customerId || ''} ${nombre} ${apellido}`);
        skipped++;
        continue;
      }

      // Buscar plan
      const plan = await findPlan(tipoPlan, tipoPantalla, Number(pantallas) || 1);

      // Parsear fechas
      let inicio = parseExcelDate(fechaInicio);
      let vencimiento = parseExcelDate(fechaVenc);
      
      // Si no hay fechas, usar defaults
      if (!inicio) {
        inicio = new Date().toISOString().split('T')[0];
      }
      if (!vencimiento) {
        const d = new Date(inicio);
        d.setDate(d.getDate() + (plan ? plan.duracionDias : 30));
        vencimiento = d.toISOString().split('T')[0];
      }

      // Mapear estado
      let estadoSub = 'Activo';
      const estadoLower = String(estado).toLowerCase();
      if (estadoLower.includes('vencid') || estadoLower.includes('expir')) estadoSub = 'Vencido';
      if (estadoLower.includes('cancel') || estadoLower.includes('baja') || estadoLower.includes('inactiv')) estadoSub = 'Cancelado';

      // Verificar si ya existe una suscripción similar
      const existing = await Subscription.findOne({
        where: { clientId: client.id, planId: plan.id, fechaInicio: inicio }
      });

      if (existing) {
        skipped++;
        continue;
      }

      const obsText = [
        observacion,
        revendedor ? `Revendedor: ${revendedor}` : '',
        cuentaDedicada ? `Cuenta Dedicada: ${cuentaDedicada}` : '',
        'Migrado desde Excel (Estado Pantallas)'
      ].filter(Boolean).join(' | ');

      if (!isDryRun) {
        await Subscription.create({
          clientId: client.id,
          planId: plan.id,
          fechaInicio: inicio,
          fechaVencimiento: vencimiento,
          estado: estadoSub,
          observaciones: obsText
        });
      }

      console.log(`    ✅ ${isDryRun ? '[SIM]' : ''} Suscripción: ${client.name} → ${plan.nombre} (${estadoSub}) [${inicio} → ${vencimiento}]`);
      created++;
    } catch (e) {
      console.log(`    ❌ Error: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n  📊 Resultado: ${created} creadas | ${skipped} saltadas | ${errors} errores`);
  return created;
}

// ============ MIGRAR VENTAS IPTV -> PAGOS + SUSCRIPCIONES ============

async function migrateVentasIPTV(isDryRun) {
  console.log('\n' + '='.repeat(60));
  console.log('💰 MIGRANDO: Ventas_LicenciaIPVT2024.xlsx → payments');
  console.log('='.repeat(60));

  const rows = readExcel('1-orders_table_Ventas_LicenciaIPVT2024.xlsx');
  printColumns(rows, 'Ventas Licencia IPTV');
  
  if (mode === 'analyze' || rows.length === 0) return;

  let created = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    try {
      const customerId = row.Customer_id || row.customer_id || row.CustomerId || null;
      const nombre = row.Nombre || row.nombre || '';
      const apellido = row.Apellido || row.apellido || '';
      const monto = row.Monto || row.monto || row.Total || row.total || row.Precio || row.precio || row.Price || row.Item_Price || 0;
      const fechaPago = row.Fecha || row.fecha || row.Date || row.date || row.Fecha_Pago || row.fecha_pago || null;
      const mes = row.Mes || row.mes || null;
      const cantidad = row.Item_Quantity || row.Cantidad || row.cantidad || 1;
      const tipoPlan = row['Tipo de Plan'] || row.tipo_plan || '';
      const tipoPantalla = row['Tipo de Pantalla'] || row.tipo_pantalla || '';
      const revendedor = row.Revendedor || row.revendedor || '';
      const cuentaDedicada = row['Cuenta Dedicada'] || '';
      const metodoPago = row.Metodo_Pago || row.metodo_pago || row['Método de Pago'] || row.MetodoPago || 'Nequi';
      const comprobante = row.Comprobante || row.comprobante || row.Referencia || row.referencia || row.Id_vnta || row.Id_VM || '';
      const sku = row.SKU || row.sku || '';

      // Buscar cliente
      const client = await findClient(customerId, nombre, apellido);
      if (!client) {
        skipped++;
        continue;
      }

      // Parsear monto (limpiar formato)
      let montoNum = 0;
      if (typeof monto === 'number') {
        montoNum = monto;
      } else if (typeof monto === 'string') {
        montoNum = parseFloat(monto.replace(/[^0-9.-]/g, '')) || 0;
      }

      // Si monto es 0, intentar calcular del plan
      if (montoNum === 0) {
        const plan = await findPlan(tipoPlan, tipoPantalla, Number(cantidad) || 1);
        montoNum = plan ? plan.precio : 8000;
      }

      // Parsear fecha
      let fecha = parseExcelDate(fechaPago);
      if (!fecha && mes) {
        // Construir fecha desde el mes (ej: "Mayo" -> 2024-05-01)
        const meses = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
        const mesNum = meses[String(mes).toLowerCase()] || 1;
        fecha = `2024-${String(mesNum).padStart(2, '0')}-01`;
      }
      if (!fecha) fecha = '2024-01-01';

      // Fecha de vencimiento (+30 días)
      const fechaVenc = new Date(new Date(fecha).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Buscar suscripción del cliente (la más reciente)
      const subscription = await Subscription.findOne({
        where: { clientId: client.id },
        order: [['createdAt', 'DESC']]
      });

      const obsText = [
        tipoPlan ? `Plan: ${tipoPlan}` : '',
        tipoPantalla ? `Pantalla: ${tipoPantalla}` : '',
        revendedor ? `Revendedor: ${revendedor}` : '',
        cuentaDedicada ? `Cuenta Dedicada: ${cuentaDedicada}` : '',
        sku ? `SKU: ${sku}` : '',
        'Migrado desde Excel (Ventas IPTV 2024)'
      ].filter(Boolean).join(' | ');

      if (!isDryRun) {
        await Payment.create({
          clientId: client.id,
          subscriptionId: subscription ? subscription.id : null,
          monto: montoNum,
          fechaPago: fecha,
          fechaVencimiento: fechaVenc,
          metodoPago: String(metodoPago).trim() || 'Nequi',
          comprobante: comprobante ? String(comprobante).trim() : null,
          estado: 'Pagado',
          observaciones: obsText
        });
      }

      created++;
      if (created % 100 === 0) {
        console.log(`    ✅ ${isDryRun ? '[SIM]' : ''} ${created} pagos procesados...`);
      }
    } catch (e) {
      errors++;
      if (errors <= 5) console.log(`    ❌ Error: ${e.message}`);
    }
  }

  console.log(`\n  📊 Resultado: ${created} pagos creados | ${skipped} saltados | ${errors} errores`);
  return created;
}

// ============ MIGRAR VENTAS FIRE TV -> PAGOS + DISPOSITIVOS ============

async function migrateVentasFireTV(isDryRun) {
  console.log('\n' + '='.repeat(60));
  console.log('📺 MIGRANDO: Ventas_Firetv2024.xlsx → payments + devices');
  console.log('='.repeat(60));

  const rows = readExcel('1-orders_table_Ventas_Firetv2024.xlsx');
  printColumns(rows, 'Ventas Fire TV');
  
  if (mode === 'analyze' || rows.length === 0) return;

  let paymentsCreated = 0, devicesCreated = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    try {
      const customerId = row.Customer_id || row.customer_id || null;
      const nombre = row.Nombre || row.nombre || '';
      const apellido = row.Apellido || row.apellido || '';
      const accion = row.Accion || row.accion || '';
      const sku = row.SKU || row.sku || '';
      const tipoFire = row['TIPO DE FIRE'] || row.TIPO_DE_FIRE || row.tipo_fire || '';
      const monto = row.Monto || row.monto || row.Total || row.total || row.Precio || row.precio || 0;
      const fecha = row.Fecha || row.fecha || row.Date || null;
      const serial = row.Serial || row.serial || row.MAC || row.mac || '';

      // Buscar cliente
      const client = await findClient(customerId, nombre, apellido);
      if (!client) {
        skipped++;
        continue;
      }

      // Determinar tipo de dispositivo
      let tipoDevice = 'Smart TV';
      const fireStr = String(tipoFire).toLowerCase();
      if (fireStr.includes('lite')) tipoDevice = 'Smart TV';
      else if (fireStr.includes('4k')) tipoDevice = 'Smart TV';
      else if (fireStr.includes('hd')) tipoDevice = 'Smart TV';

      // Determinar precio del Fire TV
      let montoNum = 0;
      if (typeof monto === 'number') montoNum = monto;
      else if (typeof monto === 'string') montoNum = parseFloat(monto.replace(/[^0-9.-]/g, '')) || 0;
      
      if (montoNum === 0) {
        // Precios por defecto según tipo
        if (fireStr.includes('4k')) montoNum = 190000;
        else if (fireStr.includes('lite')) montoNum = 160000;
        else montoNum = 160000;
      }

      const fechaParsed = parseExcelDate(fecha) || '2024-01-01';

      // Crear pago por la venta del Fire TV
      if (!isDryRun) {
        await Payment.create({
          clientId: client.id,
          subscriptionId: null,
          monto: montoNum,
          fechaPago: fechaParsed,
          fechaVencimiento: null,
          metodoPago: 'Nequi',
          comprobante: row.Id_vnta || row.id_vnta || null,
          estado: 'Pagado',
          observaciones: `Venta Fire TV ${tipoFire} | SKU: ${sku} | Acción: ${accion} | Migrado desde Excel`
        });
        paymentsCreated++;

        // Crear dispositivo
        await Device.create({
          clientId: client.id,
          subscriptionId: null,
          nombre: `Fire TV ${tipoFire}`.trim(),
          tipo: tipoDevice,
          mac: serial || null,
          activo: true,
          observaciones: `SKU: ${sku} | ${accion} | Migrado desde Excel (Ventas Fire TV 2024)`
        });
        devicesCreated++;
      } else {
        paymentsCreated++;
        devicesCreated++;
      }

      if (paymentsCreated % 50 === 0) {
        console.log(`    ✅ ${isDryRun ? '[SIM]' : ''} ${paymentsCreated} ventas FireTV procesadas...`);
      }
    } catch (e) {
      errors++;
      if (errors <= 5) console.log(`    ❌ Error: ${e.message}`);
    }
  }

  console.log(`\n  📊 Resultado: ${paymentsCreated} pagos + ${devicesCreated} dispositivos | ${skipped} saltados | ${errors} errores`);
}

// ============ MIGRAR BAJAS -> ACTUALIZAR SUSCRIPCIONES ============

async function migrateBajas(isDryRun) {
  console.log('\n' + '='.repeat(60));
  console.log('🔴 MIGRANDO: Bajas_LicenciaIPTV.xlsx → subscriptions (cancelar)');
  console.log('='.repeat(60));

  const rows = readExcel('1-orders_table_Bajas_LicenciaIPTV.xlsx');
  printColumns(rows, 'Bajas IPTV');
  
  if (mode === 'analyze' || rows.length === 0) return;

  let updated = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    try {
      const customerId = row.Customer_id || row.customer_id || null;
      const nombre = row.Nombre || row.nombre || '';
      const apellido = row.Apellido || row.apellido || '';
      const idBaja = row.Id_VM || row.id_vm || '';
      const sku = row.SKU || row.sku || '';
      const tipoFire = row['TIPO DE FIRE'] || row.TIPO_DE_FIRE || '';

      // Buscar cliente
      const client = await findClient(customerId, nombre, apellido);
      if (!client) {
        skipped++;
        continue;
      }

      // Buscar suscripción activa del cliente y cancelarla
      const activeSub = await Subscription.findOne({
        where: { clientId: client.id, estado: 'Activo' }
      });

      if (!activeSub) {
        // No tiene suscripción activa, buscar cualquiera
        const anySub = await Subscription.findOne({
          where: { clientId: client.id },
          order: [['createdAt', 'DESC']]
        });
        if (anySub && anySub.estado !== 'Cancelado') {
          if (!isDryRun) {
            await anySub.update({
              estado: 'Cancelado',
              observaciones: `${anySub.observaciones || ''} | BAJA: ${idBaja} | SKU: ${sku} | Fire: ${tipoFire} | Migrado desde Excel`
            });
          }
          updated++;
          console.log(`    ✅ ${isDryRun ? '[SIM]' : ''} Baja: ${client.name} (${idBaja})`);
        } else {
          skipped++;
        }
        continue;
      }

      if (!isDryRun) {
        await activeSub.update({
          estado: 'Cancelado',
          observaciones: `${activeSub.observaciones || ''} | BAJA: ${idBaja} | SKU: ${sku} | Fire: ${tipoFire} | Migrado desde Excel`
        });
      }
      
      // También desactivar dispositivos del cliente
      if (!isDryRun) {
        await Device.update(
          { activo: false, observaciones: sequelize.literal(`observaciones || ' | Baja: ${idBaja}'`) },
          { where: { clientId: client.id } }
        );
      }

      updated++;
      console.log(`    ✅ ${isDryRun ? '[SIM]' : ''} Baja: ${client.name} (${idBaja})`);
    } catch (e) {
      errors++;
      if (errors <= 5) console.log(`    ❌ Error: ${e.message}`);
    }
  }

  console.log(`\n  📊 Resultado: ${updated} suscripciones canceladas | ${skipped} saltados | ${errors} errores`);
}

// ============ RESUMEN FINAL ============

async function printFinalSummary() {
  console.log('\n' + '═'.repeat(60));
  console.log('  📊 ESTADO FINAL DE LA BASE DE DATOS');
  console.log('═'.repeat(60));

  const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  
  for (const t of tables) {
    const [count] = await sequelize.query(`SELECT COUNT(*) as total FROM '${t.name}'`);
    const icon = count[0].total > 0 ? '✅' : '⚪';
    console.log(`  ${icon} ${t.name}: ${count[0].total} registros`);
  }

  // Estadísticas adicionales
  const [activeClients] = await sequelize.query("SELECT COUNT(*) as total FROM clients WHERE estatus = 'Activo' AND role = 'user'");
  const [activeSubs] = await sequelize.query("SELECT COUNT(*) as total FROM subscriptions WHERE estado = 'Activo'");
  const [cancelledSubs] = await sequelize.query("SELECT COUNT(*) as total FROM subscriptions WHERE estado = 'Cancelado'");
  const [totalPaid] = await sequelize.query("SELECT COALESCE(SUM(monto), 0) as total FROM payments WHERE estado = 'Pagado'");
  const [activeDevices] = await sequelize.query("SELECT COUNT(*) as total FROM devices WHERE activo = 1");

  console.log('\n  📈 KPIs:');
  console.log(`  - Clientes activos: ${activeClients[0].total}`);
  console.log(`  - Suscripciones activas: ${activeSubs[0].total}`);
  console.log(`  - Suscripciones canceladas: ${cancelledSubs[0].total}`);
  console.log(`  - Ingresos totales: $${Number(totalPaid[0].total).toLocaleString('es-CO')}`);
  console.log(`  - Dispositivos activos: ${activeDevices[0].total}`);
}

// ============ MAIN ============

(async () => {
  try {
    console.log('═'.repeat(60));
    console.log('  ChikisdTV - FASE 2: Migración de Datos');
    console.log(`  Modo: ${mode.toUpperCase()}`);
    console.log(`  Fecha: ${new Date().toLocaleString('es-CO')}`);
    console.log('═'.repeat(60));

    await sequelize.authenticate();
    await sequelize.sync();
    console.log('✅ Base de datos conectada y sincronizada');

    // Verificar que los clientes ya se migraron
    const clientCount = await Client.count({ where: { role: 'user' } });
    console.log(`📋 Clientes existentes: ${clientCount}`);
    if (clientCount === 0) {
      console.error('❌ No hay clientes en la BD. Primero ejecuta: node scratch_migrate_data.js --migrate');
      process.exit(1);
    }

    // 1. Estado de Pantallas → Suscripciones
    await migrateEstadoPantallas(mode === 'dry-run');

    // 2. Ventas IPTV → Pagos
    await migrateVentasIPTV(mode === 'dry-run');

    // 3. Ventas Fire TV → Pagos + Dispositivos
    await migrateVentasFireTV(mode === 'dry-run');

    // 4. Bajas → Cancelar suscripciones
    await migrateBajas(mode === 'dry-run');

    // Resumen final
    await printFinalSummary();

    if (mode !== 'migrate') {
      console.log('\n⚠️  Para ejecutar la migración real:');
      console.log('    node scratch_migrate_fase2.js --migrate');
    } else {
      console.log('\n🎉 ¡Migración Fase 2 completada exitosamente!');
    }

  } catch (e) {
    console.error('\n❌ ERROR FATAL:', e.message);
    console.error(e.stack);
  }
  process.exit(0);
})();
