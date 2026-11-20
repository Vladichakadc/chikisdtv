// Normalización de medios de pago al guardar: el banco Nu (Nu Bank) se
// escribe siempre "NU" (llegaba también como "Nu" o, por error, "UN").
const ALIAS = [
  { patron: /^\s*(nu|un|nu\s*bank|nubank)\s*$/i, valor: 'NU' },
];

function normalizarMedioPago(medio) {
  if (medio == null) return medio;
  const t = String(medio).trim();
  if (!t) return null;
  const alias = ALIAS.find(a => a.patron.test(t));
  return alias ? alias.valor : t;
}

// Corrige los registros ya guardados (idempotente). Devuelve cuántos cambió.
async function unificarMediosPago(sequelize) {
  let total = 0;
  for (const tabla of ['ventas', 'ventas_equipos', 'costo_pantalla']) {
    try {
      const donde = `UPPER(TRIM(medioPago)) IN ('NU', 'UN', 'NU BANK', 'NUBANK') AND medioPago <> 'NU'`;
      const [[{ n }]] = await sequelize.query(`SELECT COUNT(*) AS n FROM ${tabla} WHERE ${donde}`);
      if (Number(n) > 0) await sequelize.query(`UPDATE ${tabla} SET medioPago = 'NU' WHERE ${donde}`);
      total += Number(n) || 0;
    } catch { /* la tabla o la columna no existe en esta instalación */ }
  }
  return total;
}

module.exports = { normalizarMedioPago, unificarMediosPago };
