const express = require('express');
const router = express.Router();
const { Plan, Venta, Planificador, CostoPantalla } = require('../../models');
const { getPeriodoActual } = require('../../utils/dateUtils');
const asyncHandler = require('../../middleware/asyncHandler');

// ============ PLANS CRUD ============
router.get('/plans', asyncHandler(async (_req, res) => {
  const plans = await Plan.findAll({ order: [['precio', 'ASC']] });
  res.json(plans);
}));

// ============ DESEMPEÑO POR PLAN (ventas + planificador) ============
// El catálogo `plans` es configuración; los planes que el negocio vende de
// verdad viven en ventas.tipoPlan (Plan Mensual/Semestral/Anual + promos).
// Este endpoint agrega ambos mundos: ingresos/renovaciones por plan desde
// ventas, y base instalada vigente cruzando cada pantalla del planificador
// con su última venta (planificador.tipoPlan está casi siempre vacío).

const MES_NUM = {
  ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
  JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
};
const mesNum = (m) => MES_NUM[(m || '').toString().trim().toUpperCase()] || 0;
const MES_LABEL = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
// Misma convención de mensualización que /dashboard-bi (MRR normalizado),
// extendida con la cobertura de las promociones para poder costearlas
// (3+1 = 4 meses de servicio; 7 meses + 1 gratis = 8 meses de servicio).
const MESES_POR_PLAN = {
  'Plan Mensual': 1, 'Plan Semestral': 6, 'Plan Anual': 12,
  '3+1 Mundial': 4, '7 MESES + 1 MES GRATIS': 8,
};

router.get('/plans/performance', asyncHandler(async (_req, res) => {
  const [ventas, pantallas, catalogo, recargas] = await Promise.all([
    Venta.findAll({
      attributes: ['idPantalla', 'anio', 'mes', 'fecha', 'precioVenta', 'tipoPago', 'tipoPlan', 'pantallas'],
      raw: true,
    }),
    Planificador.findAll({
      attributes: ['idPantalla', 'pantallas', 'finalizacion', 'duracionReal', 'debe', 'montoDebe', 'customerId'],
      raw: true,
    }),
    Plan.findAll({ raw: true }),
    CostoPantalla.findAll({ attributes: ['anio', 'costoPantallaCOP', 'itemQuantity', 'fecha', 'trm'], raw: true }),
  ]);

  // TRM más reciente registrada en Costo Pantalla — se usa como tasa por
  // defecto para cotizar la oferta rápida en dólares (editable en la UI)
  const trmVigente = recargas
    .filter(r => Number(r.trm) > 0)
    .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')))[0]?.trm || null;

  // ── Costo por pantalla-mes (módulo Costo Pantalla) ──
  // Promedio ponderado por cantidad de cuentas recargadas, por año. Cada venta
  // se costea con el costo del AÑO en que ocurrió (no con el costo de hoy),
  // para que la rentabilidad histórica no quede distorsionada por la TRM actual.
  const costoAnioAcc = {};
  for (const r of recargas) {
    const c = Number(r.costoPantallaCOP);
    if (!r.anio || !c) continue;
    const w = Number(r.itemQuantity) || 1;
    const acc = (costoAnioAcc[r.anio] ||= { suma: 0, peso: 0, recargas: 0 });
    acc.suma += c * w;
    acc.peso += w;
    acc.recargas += 1;
  }
  const costoPorAnio = Object.fromEntries(
    Object.entries(costoAnioAcc).map(([anio, a]) => [anio, a.suma / a.peso])
  );
  const aniosConCosto = Object.keys(costoPorAnio).sort();
  const costoGlobal = aniosConCosto.length
    ? Object.values(costoAnioAcc).reduce((s, a) => s + a.suma, 0) / Object.values(costoAnioAcc).reduce((s, a) => s + a.peso, 0)
    : 0;
  const anioVigente = aniosConCosto[aniosConCosto.length - 1] || null;
  const costoVigente = anioVigente ? costoPorAnio[anioVigente] : 0;
  const costoDeAnio = (anio) => costoPorAnio[anio] || costoGlobal;

  const hoy = new Date();
  const anioHoy = hoy.getFullYear();
  const mesHoy = hoy.getMonth() + 1;
  const hoyStr = `${anioHoy}-${String(mesHoy).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  // Tope para el comparativo YTD por plan: el último mes CERRADO, no el mes en
  // curso — comparar "Ene-mesHoy" de este año (parcial) contra el mismo rango del
  // año pasado (completo) infla artificialmente la caída de cada plan. `hoyStr`/
  // `mesHoy` arriba SÍ siguen usándose tal cual para "¿esta pantalla sigue vigente
  // hoy?" (punto en el tiempo, no promedio de período) — eso no tiene el sesgo.
  const { mesesCerrados } = getPeriodoActual();

  // Última venta con plan por pantalla → plan vigente de la base instalada
  const ultimaPorPantalla = {};
  for (const v of ventas) {
    if (!v.idPantalla || !v.tipoPlan) continue;
    const prev = ultimaPorPantalla[v.idPantalla];
    if (!prev || String(v.fecha || '') > String(prev.fecha || '')) ultimaPorPantalla[v.idPantalla] = v;
  }

  const planes = {};
  const ensure = (nombre) => (planes[nombre] ||= {
    plan: nombre,
    ventas: 0, ingresos: 0, renovaciones: 0, activaciones: 0,
    ingresosYTD: 0, ventasYTD: 0, ingresosYTDAnterior: 0,
    mensualizado: 0, costoEstimado: 0, ventasCosteadas: 0,
    pantallasVigentes: 0, pantallasVencidas: 0, clientesActivos: new Set(),
    conDeuda: 0, montoDeuda: 0,
  });

  // ── Ventas: ingresos, mezcla renovación/activación, comparativo YTD ──
  for (const v of ventas) {
    const nombre = v.tipoPlan || 'Sin clasificar';
    // Cortesia y Cambio de Plan son registros administrativos, no ingreso real
    // (misma exclusión que /dashboard-bi)
    if (v.tipoPago === 'Cortesia' || v.tipoPago === 'Cambio de Plan') continue;
    const p = ensure(nombre);
    const monto = Number(v.precioVenta) || 0;
    p.ventas += 1;
    p.ingresos += monto;
    p.mensualizado += monto / (MESES_POR_PLAN[nombre] || 1);
    // Costo estimado de servir la venta: meses de cobertura × pantallas
    // vendidas × costo por pantalla-mes del año de la venta (Costo Pantalla)
    const meses = MESES_POR_PLAN[nombre];
    if (meses) {
      p.costoEstimado += meses * (Number(v.pantallas) || 1) * costoDeAnio(v.anio);
      p.ventasCosteadas += 1;
    }
    if (v.tipoPago === 'Renovacion') p.renovaciones += 1;
    else if (v.tipoPago === 'Activacion Pantalla') p.activaciones += 1;
    const anio = Number(v.anio);
    const mm = mesNum(v.mes);
    if (anio === anioHoy && mm > 0 && mm <= mesesCerrados) { p.ingresosYTD += monto; p.ventasYTD += 1; }
    if (anio === anioHoy - 1 && mm > 0 && mm <= mesesCerrados) p.ingresosYTDAnterior += monto;
  }

  // ── Planificador: base instalada vigente/vencida y deuda por plan ──
  let pantallasSinPlan = 0;
  for (const row of pantallas) {
    const venta = ultimaPorPantalla[row.idPantalla];
    if (!venta) { pantallasSinPlan += Number(row.pantallas) || 0; continue; }
    const p = ensure(venta.tipoPlan);
    const n = Number(row.pantallas) || 0;
    const fin = row.duracionReal || row.finalizacion;
    if (fin && String(fin) >= hoyStr) p.pantallasVigentes += n;
    else p.pantallasVencidas += n;
    if (row.customerId) p.clientesActivos.add(row.customerId);
    if (row.debe) { p.conDeuda += 1; p.montoDeuda += Number(row.montoDebe) || 0; }
  }

  const totalIngresos = Object.values(planes).reduce((s, p) => s + p.ingresos, 0);
  const nombresCatalogo = new Set(catalogo.map(c => (c.nombre || '').trim().toLowerCase()));

  const lista = Object.values(planes)
    .map(p => {
      const transacciones = p.renovaciones + p.activaciones;
      const crecimientoYTDPct = p.ingresosYTDAnterior > 0
        ? Number((((p.ingresosYTD - p.ingresosYTDAnterior) / p.ingresosYTDAnterior) * 100).toFixed(1))
        : null;
      const costeable = p.ventasCosteadas > 0;
      const costoEstimado = costeable ? Math.round(p.costoEstimado) : null;
      const margenEstimado = costeable ? Math.round(p.ingresos - p.costoEstimado) : null;
      const margenPctEstimado = costeable && p.ingresos > 0
        ? Number((((p.ingresos - p.costoEstimado) / p.ingresos) * 100).toFixed(1))
        : null;
      return {
        plan: p.plan,
        enCatalogo: nombresCatalogo.has(p.plan.trim().toLowerCase()),
        mesesCobertura: MESES_POR_PLAN[p.plan] || null,
        ventas: p.ventas,
        ingresos: Math.round(p.ingresos),
        pctIngresos: totalIngresos > 0 ? Number(((p.ingresos / totalIngresos) * 100).toFixed(1)) : 0,
        ticketPromedio: p.ventas > 0 ? Math.round(p.ingresos / p.ventas) : 0,
        renovaciones: p.renovaciones,
        activaciones: p.activaciones,
        pctRenovacion: transacciones > 0 ? Number(((p.renovaciones / transacciones) * 100).toFixed(1)) : null,
        ingresosYTD: Math.round(p.ingresosYTD),
        ventasYTD: p.ventasYTD,
        ingresosYTDAnterior: Math.round(p.ingresosYTDAnterior),
        crecimientoYTDPct,
        mensualizado: Math.round(p.mensualizado),
        costoEstimado,
        margenEstimado,
        margenPctEstimado,
        pantallasVigentes: p.pantallasVigentes,
        pantallasVencidas: p.pantallasVencidas,
        clientesActivos: p.clientesActivos.size,
        conDeuda: p.conDeuda,
        montoDeuda: Math.round(p.montoDeuda),
      };
    })
    .sort((a, b) => b.ingresos - a.ingresos);

  // ── Serie mensual completa (todos los meses con datos): ingresos por plan ──
  // El frontend decide la ventana (últimos 12 meses o un año específico).
  // Los planes menores se agrupan como "Otros" para no saturar el gráfico.
  const topPlanes = lista.slice(0, 3).map(p => p.plan);
  const seriePorMes = {};
  for (const v of ventas) {
    if (v.tipoPago === 'Cortesia' || v.tipoPago === 'Cambio de Plan') continue;
    const mm = mesNum(v.mes);
    if (!v.anio || mm === 0) continue;
    const key = `${v.anio}-${String(mm).padStart(2, '0')}`;
    const serie = (seriePorMes[key] ||= { key, label: `${MES_LABEL[mm]} ${String(v.anio).slice(2)}` });
    const nombre = v.tipoPlan || 'Sin clasificar';
    const col = topPlanes.includes(nombre) ? nombre : 'Otros';
    serie[col] = (serie[col] || 0) + (Number(v.precioVenta) || 0);
  }
  const serieMensual = Object.values(seriePorMes)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(m => ({ ...m, ...Object.fromEntries(Object.entries(m).map(([k, val]) => [k, typeof val === 'number' ? Math.round(val) : val])) }));

  res.json({
    planes: lista,
    topPlanes,
    serieMensual,
    costoPantalla: {
      vigente: Math.round(costoVigente),
      anioVigente,
      recargasVigente: anioVigente ? costoAnioAcc[anioVigente].recargas : 0,
      promedioHistorico: Math.round(costoGlobal),
      trmVigente,
      // Costo por pantalla-mes año por año (misma base ponderada de arriba) —
      // para el comparativo "costo de este año vs el anterior" en el frontend.
      porAnio: aniosConCosto.map(anio => ({
        anio,
        costoPorPantalla: Math.round(costoPorAnio[anio]),
        recargas: costoAnioAcc[anio].recargas,
      })),
    },
    totales: {
      ingresos: Math.round(totalIngresos),
      ventas: lista.reduce((s, p) => s + p.ventas, 0),
      pantallasVigentes: lista.reduce((s, p) => s + p.pantallasVigentes, 0),
      mensualizado: lista.reduce((s, p) => s + p.mensualizado, 0),
    },
    pantallasSinPlan,
    anioActual: anioHoy,
    mesActual: mesHoy,
  });
}));

router.post('/plans', asyncHandler(async (req, res) => {
  const plan = await Plan.create(req.body);
  res.status(201).json(plan);
}));

router.put('/plans/:id', asyncHandler(async (req, res) => {
  await Plan.update(req.body, { where: { id: req.params.id } });
  const plan = await Plan.findByPk(req.params.id);
  res.json(plan);
}));

router.delete('/plans/:id', asyncHandler(async (req, res) => {
  await Plan.destroy({ where: { id: req.params.id } });
  res.json({ message: 'Plan eliminado' });
}));

module.exports = router;
