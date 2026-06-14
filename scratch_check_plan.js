const sequelize = require('./server/config/database');
const fs = require('fs');

(async () => {
  await sequelize.authenticate();
  const [rows] = await sequelize.query("SELECT nickname, nombre, apellido, customerId, pantallas FROM planificador WHERE nickname IS NOT NULL LIMIT 10");
  console.log(`Planificador con nickname: ${rows.length}`);
  rows.forEach(r => console.log(`  "${r.nickname}" -> ${r.nombre} ${r.apellido} (${r.customerId})`));
  
  const [total] = await sequelize.query("SELECT COUNT(*) as total FROM planificador");
  console.log(`\nTotal registros planificador: ${total[0].total}`);
  
  const [nullNick] = await sequelize.query("SELECT COUNT(*) as total FROM planificador WHERE nickname IS NULL OR nickname = ''");
  console.log(`Sin nickname: ${nullNick[0].total}`);
  
  const [withNick] = await sequelize.query("SELECT COUNT(DISTINCT nickname) as total FROM planificador WHERE nickname IS NOT NULL AND nickname != ''");
  console.log(`Nicknames únicos: ${withNick[0].total}`);
  
  // Guardar resultado
  const output = { rows, total: total[0].total, sinNick: nullNick[0].total, conNick: withNick[0].total };
  fs.writeFileSync('planificador_check.json', JSON.stringify(output, null, 2));
  console.log('\n=> Guardado en planificador_check.json');
  process.exit(0);
})();
