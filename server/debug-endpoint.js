const { Venta } = require('./models');
const { Sequelize } = require('sequelize');
const { Op } = Sequelize;

(async () => {
  try {
    console.log('🔍 DEBUG: Ejecutando la query exacta del endpoint...\n');

    const data = await Venta.findAll({
      attributes: [
        'anio',
        'tipoPlan',
        [Sequelize.fn('SUM', Sequelize.col('precioVenta')), 'totalIngreso'],
        [Sequelize.fn('COUNT', Sequelize.col('idVM')), 'cantidadVentas']
      ],
      where: {
        anio: { [Op.not]: null },
        tipoPlan: { [Op.not]: null }
      },
      group: ['anio', 'tipoPlan'],
      raw: true,
      order: [['anio', 'DESC'], ['totalIngreso', 'DESC']]
    });

    console.log('✅ Query exitosa. Filas retornadas:', data.length);

    if (data.length === 0) {
      console.log('⚠️ ADVERTENCIA: Query retornó 0 filas');
    } else {
      console.log('\nPrimeras 5 filas:');
      data.slice(0, 5).forEach((row, idx) => {
        console.log(`  ${idx + 1}. ${row.anio} | ${row.tipoPlan} | Ingreso: ${row.totalIngreso} | Ventas: ${row.cantidadVentas}`);
      });
    }

    // Transformar datos
    console.log('\n🔄 Transformando datos...');
    const porAnioYPlan = {};
    data.forEach(row => {
      if (!porAnioYPlan[row.anio]) {
        porAnioYPlan[row.anio] = { anio: row.anio, total: 0 };
      }
      porAnioYPlan[row.anio][row.tipoPlan] = Math.round(Number(row.totalIngreso) || 0);
      porAnioYPlan[row.anio].total += Math.round(Number(row.totalIngreso) || 0);
    });

    const tiposPlanes = new Set();
    data.forEach(row => {
      if (row.tipoPlan) tiposPlanes.add(row.tipoPlan);
    });

    const series = Object.values(porAnioYPlan).sort((a, b) => a.anio.localeCompare(b.anio));
    const tipos = Array.from(tiposPlanes).sort();

    console.log('✅ Transformación exitosa');
    console.log('   - Series (años):', series.length);
    console.log('   - Tipos de plan:', tipos.length);

    // Validación de la respuesta
    console.log('\n🔎 Validando respuesta para enviar al frontend...');
    const response = { series, tiposPlanes: tipos };

    console.log('   - response.series es array:', Array.isArray(response.series));
    console.log('   - response.series.length:', response.series.length);
    console.log('   - response.tiposPlanes es array:', Array.isArray(response.tiposPlanes));
    console.log('   - response.tiposPlanes.length:', response.tiposPlanes.length);

    if (!Array.isArray(response.series) || response.series.length === 0) {
      console.log('\n❌ PROBLEMA: series es vacía o no es un array');
    } else if (!Array.isArray(response.tiposPlanes) || response.tiposPlanes.length === 0) {
      console.log('\n❌ PROBLEMA: tiposPlanes es vacía o no es un array');
    } else {
      console.log('\n✅ RESPUESTA VÁLIDA para enviar al frontend');
      console.log('\nJSON que se enviará:');
      console.log(JSON.stringify(response, null, 2).substring(0, 500) + '...');
    }

  } catch (err) {
    console.error('❌ ERROR en la query:', err.message);
    console.error(err.stack);
  }
  process.exit(0);
})();
