const sequelize = require('./server/config/database');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('=== CONEXION EXITOSA ===');

    // 1. Listar tablas
    const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log('\n=== TABLAS ===');
    tables.forEach(t => console.log('  ', t.name));

    // 2. Detalle de cada tabla
    for (const t of tables) {
      if (t.name.startsWith('sqlite_')) continue;
      console.log(`\n========== ${t.name.toUpperCase()} ==========`);

      const [cols] = await sequelize.query(`PRAGMA table_info('${t.name}')`);
      console.log('COLUMNAS:');
      cols.forEach(c => {
        console.log(`  ${c.name} | ${c.type} | PK:${c.pk} | NotNull:${c.notnull} | Default:${c.dflt_value || 'null'}`);
      });

      const [fks] = await sequelize.query(`PRAGMA foreign_key_list('${t.name}')`);
      if (fks.length > 0) {
        console.log('FOREIGN KEYS:');
        fks.forEach(f => console.log(`  ${f.from} -> ${f.table}(${f.to})`));
      }

      const [idx] = await sequelize.query(`PRAGMA index_list('${t.name}')`);
      if (idx.length > 0) {
        console.log('INDICES:');
        for (const i of idx) {
          const [iCols] = await sequelize.query(`PRAGMA index_info('${i.name}')`);
          const colNames = iCols.map(ic => ic.name).join(', ');
          console.log(`  ${i.name} | unique:${i.unique} | cols: ${colNames}`);
        }
      }

      const [count] = await sequelize.query(`SELECT COUNT(*) as total FROM '${t.name}'`);
      console.log(`REGISTROS: ${count[0].total}`);

      // Mostrar datos de ejemplo si hay registros
      if (count[0].total > 0) {
        const [rows] = await sequelize.query(`SELECT * FROM '${t.name}' LIMIT 3`);
        console.log('MUESTRA:');
        rows.forEach(r => console.log('  ', JSON.stringify(r)));
      }
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
})();
