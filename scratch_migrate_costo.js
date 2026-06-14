const path = require('path');
const XLSX = require(path.join(__dirname, 'server', 'node_modules', 'xlsx'));
const sequelize = require('./server/config/database');
const { CostoPantalla } = require('./server/models');

function excelDateToISO(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return null;
}

function normalizeKey(k) {
  return k ? k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
}

function findValue(row, possibleKeys) {
  const rowKeys = Object.keys(row);
  for (const p of possibleKeys) {
    for (const rk of rowKeys) {
      if (normalizeKey(rk) === normalizeKey(p) && row[rk] !== null && row[rk] !== '') {
        return row[rk];
      }
    }
  }
  return null;
}

(async () => {
  try {
    await sequelize.authenticate();
    
    await sequelize.query('DROP TABLE IF EXISTS costo_pantalla');
    console.log('🗑️ Tabla costo_pantalla eliminada');
    await sequelize.sync();
    console.log('✅ Tabla costo_pantalla recreada');

    const filepath = path.join(__dirname, 'Tablas', 'Tabla_Costo_Pantalla.xlsx');
    const wb = XLSX.readFile(filepath);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });

    console.log(`📄 Costo Pantalla Excel: ${rows.length} filas, ${Object.keys(rows[0] || {}).length} columnas`);
    if(rows.length > 0) {
      console.log('🔍 Columnas detectadas en el Excel:', Object.keys(rows[0]));
    }

    let created = 0, errors = 0;

    for (const row of rows) {
      try {
        const accionVal = findValue(row, ['accion', 'action']);
        // Ignorar filas completamente vacias
        if (!accionVal && !findValue(row, ['id', 'idrec', 'idregistro'])) continue;

        await CostoPantalla.create({
          idRec:                  String(findValue(row, ['idrec', 'id', 'idregistro']) || '').trim() || null,
          accion:                 accionVal ? String(accionVal).trim() : null,
          creditos:               parseFloat(findValue(row, ['creditos', 'credito'])) || null,
          fecha:                  excelDateToISO(findValue(row, ['fecha', 'date'])),
          anio:                   String(findValue(row, ['año', 'ano', 'anio', 'year']) || '').trim() || null,
          mes:                    String(findValue(row, ['mes', 'month']) || '').trim() || null,
          itemQuantity:           parseInt(findValue(row, ['itemquantity', 'cantidad', 'cant', 'quantity']), 10) || 1,
          costoCOP:               parseFloat(findValue(row, ['costocop'])) || null,
          impuesto4x100COP:       parseFloat(findValue(row, ['impto4x1000cop', 'impto4x1000', 'impuesto4x1000', 'imp4x1000', 'imp4x1000cop', 'impto4x100cop', 'impuesto4x100cop', 'impuesto4x100', 'imp4x100', 'imp4x100cop'])) || null,
          costoUSD:               parseFloat(findValue(row, ['costousd'])) || null,
          trm:                    parseFloat(findValue(row, ['trm'])) || null,
          costoUnitarioCuentaUSD: parseFloat(findValue(row, ['costounitariocuentausd', 'costounitcuentausd', 'ctounitctausd', 'ctountctausd', 'costounitario', 'costounitctausd', 'costountctausd', 'ctounitcuentausd'])) || null,
          costoUnitarioCuentaCOP: parseFloat(findValue(row, ['costounitariocuentacop', 'costounitcuentacop', 'ctounitctacop', 'ctountctacop', 'costounitctacop', 'costountctacop', 'ctounitcuentacop'])) || null,
          costoPantallaUSD:       parseFloat(findValue(row, ['costopantallausd', 'ctopantallausd'])) || null,
          costoPantallaCOP:       parseFloat(findValue(row, ['costopantallacop', 'ctopantallacop'])) || null,
          medioPago:              String(findValue(row, ['mediopago', 'metodopago']) || '').trim() || null
        });

        created++;
      } catch (e) {
        errors++;
        if (errors <= 3) console.log(`  ❌ Error: ${e.message}`);
      }
    }

    console.log(`\n📊 Resultado: ${created} creadas | ${errors} errores`);
    console.log(`📋 Total CostoPantalla en BD: ${await CostoPantalla.count()}`);
    
    const sample = await CostoPantalla.findOne();
    if(sample) {
      console.log('\n🔍 Muestra de registro:');
      console.log(JSON.stringify(sample.toJSON(), null, 2));
    }
    console.log('\n🎉 ¡Migración completa!');
  } catch (e) {
    console.error('❌ ERROR:', e.message);
  }
  process.exit(0);
})();
