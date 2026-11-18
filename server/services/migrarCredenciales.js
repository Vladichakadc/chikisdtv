// Migración idempotente al arrancar:
//  1. Cifra las contraseñas de Cuentas Padre que sigan en texto plano (si hay
//     CREDENCIALES_KEY).
//  2. Borra las copias de la contraseña en el Planificador para pantallas cuya
//     cuenta padre ya la tiene (Cuentas Padre es la única fuente).
const sequelize = require('../config/database');
const { CuentaPadre } = require('../models');
const { estaCifrado, cifradoActivo } = require('../utils/cifrado');

async function migrarCredenciales() {
  let cifradas = 0;
  if (cifradoActivo()) {
    const filas = await CuentaPadre.findAll({ attributes: ['cuentaId', 'contrasena'], raw: true });
    for (const f of filas) {
      if (!f.contrasena || estaCifrado(f.contrasena)) continue;
      // update por modelo: el setter cifra
      await CuentaPadre.update({ contrasena: f.contrasena }, { where: { cuentaId: f.cuentaId } });
      cifradas++;
    }
  }
  const CONDICION = `password IS NOT NULL
      AND cuentaId IN (SELECT cuentaId FROM cuentas_padre WHERE contrasena IS NOT NULL AND contrasena <> '')`;
  // (SQLite + sequelize.query no informa filas afectadas: se cuentan antes)
  const [{ n: borradas }] = await sequelize.query(`SELECT COUNT(*) AS n FROM planificador WHERE ${CONDICION}`, { type: 'SELECT' });
  if (borradas) await sequelize.query(`UPDATE planificador SET password = NULL WHERE ${CONDICION}`);
  if (cifradas || borradas) {
    console.log(`[CREDENCIALES] ${cifradas} contraseña(s) de cuentas padre cifrada(s); ${borradas} copia(s) en el Planificador eliminada(s).`);
  }
  return { cifradas, borradas };
}

module.exports = { migrarCredenciales };
