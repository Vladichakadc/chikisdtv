const { Venta } = require('./models');
const { Sequelize } = require('sequelize');
const { Op } = Sequelize;

(async () => {
  try {
    console.log('Ejecutando query del endpoint...\n');

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

    console.log('Datos agregados (raw):', data.length, 'filas\n');
    data.slice(0, 10).forEach(row => {
      console.log(`  ${row.anio} - ${row.tipoPlan}: $${row.totalIngreso} (${row.cantidadVentas} ventas)`);
    });

    // Transformar a estructura de tiempo serie
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

    const result = {
      series: Object.values(porAnioYPlan).sort((a, b) => a.anio.localeCompare(b.anio)),
      tiposPlanes: Array.from(tiposPlanes).sort()
    };

    console.log('\n✓ Estructura transformada:');
    console.log('Series:', result.series.length, 'años');
    console.log('Tipos de plan:', result.tiposPlanes);
    console.log('\nPrimer año (ejemplo):');
    console.log(JSON.stringify(result.series[0], null, 2));

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  }
  process.exit(0);
})();
