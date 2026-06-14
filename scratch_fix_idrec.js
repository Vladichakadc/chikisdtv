const path = require('path');
const { CostoPantalla } = require(path.join(__dirname, 'server', 'models'));
const sequelize = require(path.join(__dirname, 'server', 'config', 'database'));

(async () => {
  try {
    await sequelize.authenticate();
    const records = await CostoPantalla.findAll();
    
    let maxNum = 0;
    records.forEach(r => {
      if (r.idRec) {
        const num = parseInt(r.idRec.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });

    console.log(`🔍 ID máximo existente encontrado: R${maxNum}`);

    const nullRecords = records.filter(r => !r.idRec || r.idRec.trim() === '');
    console.log(`⚠️ Encontrados ${nullRecords.length} registros sin ID... procesando corrección.`);

    for (const r of nullRecords) {
      maxNum++;
      const newIdRec = `R${maxNum}`;
      r.idRec = newIdRec;
      await r.save();
      console.log(`✅ Registro DB interno #${r.id} actualizado con el ID visible: ${newIdRec}`);
    }

    console.log('🎉 ¡Todos los registros vacíos han sido corregidos de forma secuencial!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
