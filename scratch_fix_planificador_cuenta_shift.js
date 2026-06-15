// Corrige el "corrimiento" de cuentaId en planificador: para 9 pantallas "-3",
// el archivo Excel fuente traía cuentaId = ID de la cuenta SIGUIENTE (en vez de
// repetir el de su propio grupo). Ese valor se importó tal cual a la BD y luego
// "Sincronizar Cuentas Padre" propagó los datos de cuenta vecinos (usuario,
// contraseña, crédito, inicio, fin) sobre esas 9 filas.
//
// Este script:
//   1. Restaura cuentaId al prefijo real de idPantalla.
//   2. Repuebla cuenta/password/credito/inicio/finalizacion desde la
//      CuentaPadre correcta (mismo efecto que "Sincronizar Cuentas Padre"
//      pero ya con el cuentaId corregido).
//   3. Verifica que no queden filas con idPantalla cuyo prefijo no
//      coincida con cuentaId.
//
// Uso: node scratch_fix_planificador_cuenta_shift.js

const path = require('path');
const { Planificador, CuentaPadre } = require(path.join(__dirname, 'server', 'models'));
const sequelize = require(path.join(__dirname, 'server', 'config', 'database'));

const AFFECTED_IDS = [
  'M037-3', 'M038-3', 'M039-3', 'M040-3', 'M041-3',
  'M042-3', 'M043-3', 'M044-3', 'M046-3',
];

(async () => {
  try {
    await sequelize.authenticate();

    const cuentas = await CuentaPadre.findAll();
    const cuentaMap = {};
    cuentas.forEach(c => { cuentaMap[c.cuentaId] = c; });

    for (const idPantalla of AFFECTED_IDS) {
      const row = await Planificador.findByPk(idPantalla);
      if (!row) { console.log(`SKIP ${idPantalla}: no existe en planificador`); continue; }

      const correctCuentaId = idPantalla.split('-')[0];
      const cp = cuentaMap[correctCuentaId];
      if (!cp) { console.log(`SKIP ${idPantalla}: no existe cuenta padre ${correctCuentaId}`); continue; }

      const before = { cuentaId: row.cuentaId, cuenta: row.cuenta, password: row.password, credito: row.credito, inicio: row.inicio, finalizacion: row.finalizacion };

      row.cuentaId     = cp.cuentaId;
      row.cuenta       = cp.nombreUsuario || null;
      row.password     = cp.contrasena    || null;
      row.credito      = cp.credito       ?? null;
      row.inicio       = cp.fechaInicio   || null;
      row.finalizacion = cp.fechaFin      || null;
      await row.save();

      console.log(`OK ${idPantalla}:`);
      console.log(`   antes  -> cuentaId=${before.cuentaId} cuenta=${before.cuenta} password=${before.password} credito=${before.credito} inicio=${before.inicio} fin=${before.finalizacion}`);
      console.log(`   ahora  -> cuentaId=${row.cuentaId} cuenta=${row.cuenta} password=${row.password} credito=${row.credito} inicio=${row.inicio} fin=${row.finalizacion}`);
    }

    // Verificación final: ninguna fila debe tener prefijo(idPantalla) !== cuentaId
    const all = await Planificador.findAll({ raw: true });
    const remaining = all.filter(r => {
      const prefix = (r.idPantalla || '').split('-')[0];
      return prefix && r.cuentaId && prefix !== r.cuentaId;
    });
    console.log(`\nVerificación: ${remaining.length} fila(s) restante(s) con cuentaId desalineado.`);
    remaining.forEach(r => console.log(`   ${r.idPantalla} -> cuentaId=${r.cuentaId}`));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
