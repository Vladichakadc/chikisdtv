const { Venta } = require('c:\\ChikisdTV\\server\\models');
const { Sequelize } = require('sequelize');

(async () => {
  try {
    // Verificar si hay datos con tipoPlan y anio
    const count = await Venta.count();
    console.log('Total registros en Venta:', count);

    // Contar registros con tipoPlan y anio no nulos
    const { Op } = Sequelize;
    const withPlanAndYear = await Venta.count({
      where: {
        anio: { [Op.not]: null },
        tipoPlan: { [Op.not]: null }
      }
    });
    console.log('Registros con anio y tipoPlan:', withPlanAndYear);

    // Mostrar ejemplos
    const examples = await Venta.findAll({
      where: {
        anio: { [Op.not]: null },
        tipoPlan: { [Op.not]: null }
      },
      attributes: ['anio', 'tipoPlan', 'precioVenta', 'fecha'],
      limit: 5,
      raw: true
    });
    console.log('\nEjemplos de registros:');
    examples.forEach(e => {
      console.log(`  Año: ${e.anio}, Plan: ${e.tipoPlan}, Precio: ${e.precioVenta}`);
    });

    // Contar registros únicos por año
    const porAnio = await Venta.findAll({
      attributes: [
        'anio',
        [Sequelize.fn('COUNT', Sequelize.col('anio')), 'cantidad']
      ],
      where: { anio: { [Op.not]: null } },
      group: ['anio'],
      raw: true
    });
    console.log('\nRegistros por año:');
    porAnio.forEach(p => {
      console.log(`  ${p.anio}: ${p.cantidad}`);
    });

    // Contar registros únicos por tipoPlan
    const porPlan = await Venta.findAll({
      attributes: [
        'tipoPlan',
        [Sequelize.fn('COUNT', Sequelize.col('tipoPlan')), 'cantidad']
      ],
      where: { tipoPlan: { [Op.not]: null } },
      group: ['tipoPlan'],
      raw: true
    });
    console.log('\nRegistros por tipo de plan:');
    porPlan.forEach(p => {
      console.log(`  ${p.tipoPlan}: ${p.cantidad}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
})();
