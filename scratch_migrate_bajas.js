/**
 * Migración COMPLETA de Bajas — 19 columnas del Excel
 * USO: node scratch_migrate_bajas.js
 */
const path = require('path');
const XLSX = require(path.join(__dirname, 'server', 'node_modules', 'xlsx'));
const sequelize = require('./server/config/database');
const { Baja, Client } = require('./server/models');
const { Op } = require(path.join(__dirname, 'server', 'node_modules', 'sequelize'));

function excelDateToISO(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel serial date → JS Date
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return null;
}

(async () => {
  try {
    await sequelize.authenticate();
    
    // Eliminar tabla y recrear con la estructura correcta
    await sequelize.query('DROP TABLE IF EXISTS bajas');
    console.log('🗑️ Tabla bajas eliminada');
    await sequelize.sync();
    console.log('✅ Tabla bajas recreada con estructura completa');

    const filepath = path.join(__dirname, 'Tablas', '1-orders_table_Bajas_LicenciaIPTV.xlsx');
    const wb = XLSX.readFile(filepath);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });

    console.log(`📄 Bajas Excel: ${rows.length} filas, ${Object.keys(rows[0]).length} columnas`);

    let created = 0, errors = 0;

    for (const row of rows) {
      try {
        const custId = row.Customer_id || null;
        const nombre = (row.Nombre || '').trim();
        const apellido = (row.Apellido || '').trim();

        // Buscar cliente
        let clientId = null;
        if (custId) {
          const client = await Client.findOne({ where: { customerId: String(custId).trim() } });
          if (client) clientId = client.id;
        }
        if (!clientId && nombre) {
          const fullName = `${nombre} ${apellido}`.trim();
          const client = await Client.findOne({ where: { name: { [Op.like]: `%${fullName}%` } } });
          if (client) clientId = client.id;
        }

        await Baja.create({
          idBaja: row.Id_VM ? String(row.Id_VM).trim() : null,
          customerId: custId ? String(custId).trim() : null,
          clientId,
          nombre: nombre || null,
          apellido: apellido || null,
          sku: row.SKU || null,
          tipoFire: row['TIPO DE FIRE'] || null,
          devolucion: row.Devolucion || null,
          nickname: row.Nickname || null,
          estado: row.Estado || 'Baja',
          cortesia: row.Cortesia || null,
          pantallas: row.Pantallas || 1,
          fechaBaja: excelDateToISO(row['Fecha de Baja']),
          fecha: excelDateToISO(row['Fecha ']),  // Nota: tiene espacio al final
          anio: row['Año'] || null,
          mes: row.Mes || null,
          itemQuantity: row.Item_Quantity || 1,
          tipoPlan: row['Tipo de Plan'] || null,
          tipoPantalla: row['Tipo de Pantalla'] || null,
          cuentaDedicada: row['Cuenta Dedicada'] || null,
          observaciones: 'Migrado desde Excel'
        });

        created++;
      } catch (e) {
        errors++;
        if (errors <= 3) console.log(`  ❌ Error: ${e.message}`);
      }
    }

    console.log(`\n📊 Resultado: ${created} creadas | ${errors} errores`);
    console.log(`📋 Total bajas en BD: ${await Baja.count()}`);
    
    // Verificar datos
    const sample = await Baja.findOne();
    console.log('\n🔍 Muestra de registro:');
    console.log(JSON.stringify(sample.toJSON(), null, 2));
    console.log('\n🎉 ¡Migración completa!');
  } catch (e) {
    console.error('❌ ERROR:', e.message);
  }
  process.exit(0);
})();
