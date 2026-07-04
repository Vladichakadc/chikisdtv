const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Client, Plan, Subscription, Payment, Device, Baja, Venta, VentaEquipo, CostoPantalla, Planificador, TablaCliente, CuentaPadre } = require('../../models');
const { todayStr, daysFromNow } = require('../../utils/dateUtils');
const { calcDias, alertaFromDias } = require('../../utils/planificadorAlerta');
const asyncHandler = require('../../middleware/asyncHandler');

// ============ DASHBOARD STATS ============
router.get('/dashboard-stats', asyncHandler(async (_req, res) => {
  const totalClients = await Client.count({ where: { role: 'user', estatus: 'Activo' } });
  const totalPlans = await Plan.count({ where: { activo: true } });
  const activeSubscriptions = await Subscription.count({ where: { estado: 'Activo' } });
  const totalDevices = await Device.count({ where: { activo: true } });

  const totalIngresos = (await Payment.sum('monto', { where: { estado: 'Pagado' } })) || 0;

  const pendingPayments = await Payment.count({ where: { estado: 'Pendiente' } });
  const vencidosPayments = await Payment.count({ where: { estado: 'Vencido' } });

  const today = new Date();
  const upcomingExpirations = await Subscription.count({
    where: {
      estado: 'Activo',
      fechaVencimiento: { [Op.between]: [todayStr(), daysFromNow(7)] }
    }
  });

  // ─── Cruce con Clientes (TablaCliente): mezcla de canal y alcance geográfico
  const [clientesFinal, clientesRevendedor, paisesRows] = await Promise.all([
    TablaCliente.count({ where: { tipoCliente: 'Final' } }),
    TablaCliente.count({ where: { tipoCliente: 'Revendedor' } }),
    TablaCliente.findAll({ attributes: ['pais'], raw: true }),
  ]);
  const paisesCount = new Set(paisesRows.map(r => (r.pais || '').trim()).filter(Boolean)).size;

  // ─── Cruce con Bajas: termómetro de cancelaciones/churn del año en curso ──
  const anioActual = today.getFullYear();
  const [bajasHistorico, bajasEsteAnio] = await Promise.all([
    Baja.count(),
    Baja.count({ where: { anio: anioActual } }),
  ]);

  // ─── Cruce con Cuentas Padre: inventario/capacidad instalada en cupos ─────
  const [cuentasPadreTotal, creditoCuentasPadreTotal] = await Promise.all([
    CuentaPadre.count(),
    CuentaPadre.sum('credito'),
  ]);

  // ─── Cruce con Costo Pantalla: inversión operativa del año en curso ───────
  const costosAnioRows = await CostoPantalla.findAll({
    attributes: ['costoCOP', 'impuesto4x100COP'],
    where: { anio: String(anioActual) },
    raw: true,
  });
  const inversionRecargasAnio = Math.round(
    costosAnioRows.reduce((s, c) => s + Number(c.costoCOP || 0) + Number(c.impuesto4x100COP || 0), 0)
  );

  // ─── Cruce con Planificador: capacidad disponible para nuevas ventas ──────
  // Replica la clasificación "libre" de PlanificadorPage (nickname que indica
  // "libre" o pantalla totalmente sin nombre/apellido/nickname asignado).
  // totalPantallas = SUM(pantallas) — no COUNT(*): una fila puede representar
  // más de una pantalla cuando un cliente tiene varias configuradas bajo el
  // mismo slot (columna # del Planificador).
  const pantallasRows = await Planificador.findAll({ attributes: ['nombre', 'apellido', 'nickname', 'pantallas'], raw: true });
  let pantallasLibres = 0;
  let totalPantallas = 0;
  for (const s of pantallasRows) {
    const np = Number(s.pantallas) || 0;
    totalPantallas += np;
    const nombre = (String(s.nombre ?? '') + String(s.apellido ?? '')).trim();
    const nickname = (s.nickname || '').trim();
    if (nickname.toLowerCase().includes('libre') || (!nombre && !nickname)) pantallasLibres += np;
  }

  res.json({
    totalClients,
    totalPlans,
    activeSubscriptions,
    totalDevices,
    totalIngresos,
    pendingPayments,
    vencidosPayments,
    upcomingExpirations,
    // ── Cruces con otros módulos: dan contexto de negocio a las tarjetas ──
    clientesFinal,
    clientesRevendedor,
    paisesCount,
    anioActual,
    bajasHistorico,
    bajasEsteAnio,
    cuentasPadreTotal,
    creditoCuentasPadreTotal: Math.round(creditoCuentasPadreTotal || 0),
    inversionRecargasAnio,
    totalPantallas,
    pantallasLibres,
  });
}));

// ============ BUSINESS INTELLIGENCE (Ventas vs Costos) ============
const MES_NUM = {
  ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
  JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
};
const mesNum = (m) => MES_NUM[(m || '').toString().trim().toUpperCase()] || 0;

// Caché en memoria: /dashboard-bi recalcula MRR/LTV/cohortes/Pareto sobre
// 5 tablas en cada request; los datos solo cambian con imports/ediciones
// puntuales, así que un TTL corto evita recomputar en cada carga del dashboard.
const DASHBOARD_BI_CACHE_TTL_MS = 90 * 1000;
let dashboardBiCache = { data: null, expiresAt: 0 };

router.get('/dashboard-bi', asyncHandler(async (_req, res) => {
  if (dashboardBiCache.data && Date.now() < dashboardBiCache.expiresAt) {
    return res.json(dashboardBiCache.data);
  }

  const ventas = await Venta.findAll({ attributes: ['anio', 'mes', 'precioVenta', 'tipoPago', 'estado', 'customerId', 'tipoPlan', 'fecha'] });
  const costos = await CostoPantalla.findAll({ attributes: ['anio', 'mes', 'costoCOP', 'impuesto4x100COP'] });
  // Atributos combinados: cubre tanto el agregado por año/mes (abajo) como el
  // desglose por tipo de dispositivo más adelante (antes eran dos SELECT separados)
  const bajas  = await Baja.findAll({ attributes: ['anio', 'mes', 'devolucion', 'tipoFire', 'pantallas'], raw: true });

  // ─── Agregación por año ───────────────────────────────────────────────────
  const anios = [...new Set([
    ...ventas.map(v => v.anio), ...costos.map(c => c.anio), ...bajas.map(b => String(b.anio)),
  ])].filter(Boolean).sort();

  const sumBy = (arr, keyFn, valFn) => {
    const m = {};
    for (const r of arr) {
      const k = keyFn(r);
      m[k] = (m[k] || 0) + (Number(valFn(r)) || 0);
    }
    return m;
  };
  const countBy = (arr, keyFn) => {
    const m = {};
    for (const r of arr) { const k = keyFn(r); m[k] = (m[k] || 0) + 1; }
    return m;
  };

  const ingresosPorAnio = sumBy(ventas, v => v.anio, v => v.precioVenta);
  const ventasCountPorAnio = countBy(ventas, v => v.anio);
  const costosPorAnio = sumBy(costos, c => c.anio, c => Number(c.costoCOP || 0) + Number(c.impuesto4x100COP || 0));
  const bajasCountPorAnio = countBy(bajas, b => String(b.anio));

  let prevIngresos = null;
  let prevCostos = null;
  const porAnio = anios.map(anio => {
    const ingresos = Math.round(ingresosPorAnio[anio] || 0);
    const costosVal = Math.round(costosPorAnio[anio] || 0);
    const margen = ingresos - costosVal;
    const margenPct = ingresos > 0 ? (margen / ingresos) * 100 : 0;
    const crecimientoIngresosPct = prevIngresos != null && prevIngresos > 0 ? ((ingresos - prevIngresos) / prevIngresos) * 100 : null;
    const crecimientoCostosPct = prevCostos != null && prevCostos > 0 ? ((costosVal - prevCostos) / prevCostos) * 100 : null;
    prevIngresos = ingresos;
    prevCostos = costosVal;
    return {
      anio,
      ingresos,
      costos: costosVal,
      margen,
      margenPct: Number(margenPct.toFixed(1)),
      crecimientoIngresosPct: crecimientoIngresosPct != null ? Number(crecimientoIngresosPct.toFixed(1)) : null,
      crecimientoCostosPct: crecimientoCostosPct != null ? Number(crecimientoCostosPct.toFixed(1)) : null,
      numVentas: ventasCountPorAnio[anio] || 0,
      numBajas: bajasCountPorAnio[anio] || 0,
    };
  });

  // ─── Agregación mensual (serie de tiempo anio-mes) ────────────────────────
  const monthKey = (anio, mes) => `${anio}-${String(mesNum(mes)).padStart(2, '0')}`;
  const ingresosPorMes = sumBy(ventas, v => monthKey(v.anio, v.mes), v => v.precioVenta);
  const ventasCountPorMes = countBy(ventas, v => monthKey(v.anio, v.mes));
  const costosPorMes = sumBy(costos, c => monthKey(c.anio, c.mes), c => Number(c.costoCOP || 0) + Number(c.impuesto4x100COP || 0));

  const monthKeys = [...new Set([...Object.keys(ingresosPorMes), ...Object.keys(costosPorMes)])]
    .filter(k => k.split('-')[1] !== '00')
    .sort();
  const MES_LABEL = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const porMes = monthKeys.map(key => {
    const [anio, mm] = key.split('-');
    const ingresos = Math.round(ingresosPorMes[key] || 0);
    const costosVal = Math.round(costosPorMes[key] || 0);
    return {
      key,
      label: `${MES_LABEL[Number(mm)]} ${anio.slice(2)}`,
      anio,
      ingresos,
      costos: costosVal,
      margen: ingresos - costosVal,
      numVentas: ventasCountPorMes[key] || 0,
    };
  });

  // ─── MRR normalizado por tipo de plan ────────────────────────────────────
  // Cada venta se normaliza a su equivalente mensual según la duración del
  // plan vendido, eliminando el efecto "lump-sum" de los planes anuales o
  // semestrales que distorsiona el momentum si se usan ingresos brutos.
  const MESES_POR_PLAN = { 'Plan Mensual': 1, 'Plan Semestral': 6, 'Plan Anual': 12 };
  const mrrPorMesMap = {};
  const mrrPorTipoPlanMap = {};
  for (const v of ventas) {
    if (v.tipoPago === 'Cortesia') continue;
    const key = monthKey(v.anio, v.mes);
    if (key.split('-')[1] === '00') continue;
    const divisor = MESES_POR_PLAN[v.tipoPlan] || 1;
    const contrib = (Number(v.precioVenta) || 0) / divisor;
    mrrPorMesMap[key] = (mrrPorMesMap[key] || 0) + contrib;
    const planKey = v.tipoPlan || 'Sin clasificar';
    mrrPorTipoPlanMap[planKey] = (mrrPorTipoPlanMap[planKey] || 0) + contrib;
  }

  // Añadir mrr a cada elemento de porMes
  const porMesConMrr = porMes.map(m => ({
    ...m,
    mrr: Math.round(mrrPorMesMap[m.key] || 0),
  }));

  // KPIs de MRR: mes más reciente, anterior, crecimiento MoM, ARR
  const mesesConMrr = porMesConMrr.filter(m => m.mrr > 0);
  const ultimoMesObj  = mesesConMrr[mesesConMrr.length - 1] || null;
  const penultimoMesObj = mesesConMrr[mesesConMrr.length - 2] || null;
  const mrrActual   = ultimoMesObj?.mrr || 0;
  const arrActual   = mrrActual * 12;
  const crecimientoMrrMomPct = penultimoMesObj?.mrr > 0
    ? Number((((mrrActual - penultimoMesObj.mrr) / penultimoMesObj.mrr) * 100).toFixed(1))
    : null;

  const totalMrrHistorico = Object.values(mrrPorTipoPlanMap).reduce((s, v) => s + v, 0);
  const mrrPorTipoPlan = Object.entries(mrrPorTipoPlanMap)
    .map(([plan, mrr]) => ({
      plan,
      mrr: Math.round(mrr),
      pct: totalMrrHistorico > 0 ? Number(((mrr / totalMrrHistorico) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.mrr - a.mrr);

  // Momentum corregido: variación promedio MoM sobre MRR (no ingresos brutos)
  const ultimosMrr = mesesConMrr.slice(-7);
  let sumaMrrCrec = 0, conteoMrrCrec = 0;
  for (let i = 1; i < ultimosMrr.length; i++) {
    const prev = ultimosMrr[i - 1].mrr;
    const cur  = ultimosMrr[i].mrr;
    if (prev > 0) { sumaMrrCrec += ((cur - prev) / prev) * 100; conteoMrrCrec++; }
  }
  const momentumMrrPct = conteoMrrCrec > 0 ? Number((sumaMrrCrec / conteoMrrCrec).toFixed(1)) : 0;

  // ─── Desglose por tipo de pago ────────────────────────────────────────────
  const totalIngresos = ventas.reduce((s, v) => s + (Number(v.precioVenta) || 0), 0);
  const tipoPagoMap = {};
  for (const v of ventas) {
    const tipo = v.tipoPago || 'Sin clasificar';
    if (!tipoPagoMap[tipo]) tipoPagoMap[tipo] = { tipo, cantidad: 0, total: 0 };
    tipoPagoMap[tipo].cantidad += 1;
    tipoPagoMap[tipo].total += Number(v.precioVenta) || 0;
  }
  const tipoPago = Object.values(tipoPagoMap)
    .map(t => ({ ...t, total: Math.round(t.total), pctTotal: totalIngresos > 0 ? Number(((t.total / totalIngresos) * 100).toFixed(1)) : 0 }))
    .sort((a, b) => b.total - a.total);

  // ─── KPIs generales ───────────────────────────────────────────────────────
  const totalCostos = Math.round(costos.reduce((s, c) => s + Number(c.costoCOP || 0) + Number(c.impuesto4x100COP || 0), 0));
  const margenTotal = Math.round(totalIngresos) - totalCostos;
  const margenPctTotal = totalIngresos > 0 ? Number(((margenTotal / totalIngresos) * 100).toFixed(1)) : 0;
  const ticketPromedio = ventas.length > 0 ? Math.round(totalIngresos / ventas.length) : 0;
  const renovaciones = ventas.filter(v => v.tipoPago === 'Renovacion').length;
  const tasaRenovacionPct = ventas.length > 0 ? Number(((renovaciones / ventas.length) * 100).toFixed(1)) : 0;
  const totalActivos = await Subscription.count({ where: { estado: 'Activo' } });
  const totalCancelados = await Subscription.count({ where: { estado: 'Cancelado' } });
  const churnPct = (totalActivos + totalCancelados) > 0 ? Number(((totalCancelados / (totalActivos + totalCancelados)) * 100).toFixed(1)) : 0;

  const ultimo = porAnio[porAnio.length - 1] || null;
  const penultimo = porAnio[porAnio.length - 2] || null;

  // ─── Rentabilidad: markup, cobertura y punto de equilibrio ────────────────
  // Margen (sobre ingresos) vs. Markup (sobre costos): dos lecturas distintas
  // que un financiero distingue — la primera mide eficiencia de precio, la
  // segunda mide cuánto "multiplica" cada peso invertido en costo operativo.
  const markupPct = totalCostos > 0 ? Number(((margenTotal / totalCostos) * 100).toFixed(1)) : 0;
  const coberturaCostos = totalCostos > 0 ? Number((totalIngresos / totalCostos).toFixed(2)) : 0;
  const puntoEquilibrioVentas = ticketPromedio > 0 ? Math.ceil(totalCostos / ticketPromedio) : 0;

  // ─── Ventas: concentración (Pareto), ARPU y productividad por pantalla ────
  const ventasPorCliente = {};
  for (const v of ventas) {
    const cid = v.customerId || 'SIN_ID';
    ventasPorCliente[cid] = (ventasPorCliente[cid] || 0) + (Number(v.precioVenta) || 0);
  }
  const ingresosPorClienteOrdenados = Object.values(ventasPorCliente).sort((a, b) => b - a);
  const numClientesCompradores = ingresosPorClienteOrdenados.length;
  const top20Count = Math.max(1, Math.ceil(numClientesCompradores * 0.2));
  const top20Revenue = ingresosPorClienteOrdenados.slice(0, top20Count).reduce((s, v) => s + v, 0);
  const concentracionTop20Pct = totalIngresos > 0 ? Number(((top20Revenue / totalIngresos) * 100).toFixed(1)) : 0;
  const arpu = numClientesCompradores > 0 ? Math.round(totalIngresos / numClientesCompradores) : 0;

  // Curva de concentración (similar a una curva de Lorenz/Pareto): qué % del
  // ingreso acumulan los clientes ordenados de mayor a menor aporte, en
  // deciles — permite graficar visualmente la brecha frente a una
  // distribución equitativa (la diagonal de referencia).
  const paretoIngresos = [];
  for (let i = 1; i <= 10; i++) {
    const pctClientes = i * 10;
    const cantidad = Math.max(1, Math.round((pctClientes / 100) * numClientesCompradores));
    const acumulado = ingresosPorClienteOrdenados.slice(0, cantidad).reduce((s, v) => s + v, 0);
    paretoIngresos.push({
      pctClientes,
      pctIngresos: totalIngresos > 0 ? Number(((acumulado / totalIngresos) * 100).toFixed(1)) : 0,
    });
  }

  // pantallas = SUM(columna #): una fila puede representar más de una pantalla
  // cuando un cliente tiene varias configuradas. Usar COUNT(*) subestima el total.
  // alertaReal se recalcula desde la fecha de fin real (duracionReal): el texto
  // almacenado viene del import de Excel y queda obsoleto tras una renovación
  // (misma regla que enrichPantalla en routes/admin/planificador.js).
  const alertaRowsRaw = await Planificador.findAll({ attributes: ['alertaReal', 'debe', 'customerId', 'cuentaId', 'nombre', 'apellido', 'nickname', 'pantallas', 'duracionReal'], raw: true });
  const alertaRows = alertaRowsRaw.map(r => {
    const diasRestantes = calcDias(r.duracionReal);
    return { ...r, diasRestantes, alertaReal: alertaFromDias(diasRestantes, r.alertaReal) };
  });
  const totalPantallas = alertaRows.reduce((s, r) => s + (Number(r.pantallas) || 0), 0);
  const ingresoPorPantalla = totalPantallas > 0 ? Math.round(totalIngresos / totalPantallas) : 0;
  const costoPorPantalla = totalPantallas > 0 ? Math.round(totalCostos / totalPantallas) : 0;

  // ─── Bajas: comparativo año a año con desglose por tipo de dispositivo ────
  const bajasPorAnioMap = {};
  for (const r of bajas) {
    const anio = r.anio || 0;
    if (!bajasPorAnioMap[anio]) bajasPorAnioMap[anio] = { anio, total: 0, pantallas: 0, tipos: {} };
    bajasPorAnioMap[anio].total += 1;
    bajasPorAnioMap[anio].pantallas += Number(r.pantallas || 0);
    const tipo = (r.tipoFire || '').trim() || 'Sin clasificar';
    bajasPorAnioMap[anio].tipos[tipo] = (bajasPorAnioMap[anio].tipos[tipo] || 0) + 1;
  }
  let bajasPrevTotal = null;
  const bajasPorAnioDetalle = Object.values(bajasPorAnioMap)
    .filter(b => b.anio)
    .sort((a, b) => a.anio - b.anio)
    .map(b => {
      const variacionPct = bajasPrevTotal != null && bajasPrevTotal > 0
        ? Number((((b.total - bajasPrevTotal) / bajasPrevTotal) * 100).toFixed(1)) : null;
      bajasPrevTotal = b.total;
      return {
        anio: b.anio,
        total: b.total,
        pantallas: b.pantallas,
        variacionPct,
        tipoPrincipal: Object.entries(b.tipos).sort((x, y) => y[1] - x[1])[0]?.[0] || null,
      };
    });

  // ─── Clientes: distribución geográfica (TablaCliente.pais) ────────────────
  const paisRowsBi = await TablaCliente.findAll({ attributes: ['pais'], raw: true });
  const paisCountMap = {};
  for (const r of paisRowsBi) {
    const pais = (r.pais || '').trim() || 'Sin registrar';
    paisCountMap[pais] = (paisCountMap[pais] || 0) + 1;
  }
  const paisesClientes = Object.entries(paisCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([pais, cantidad]) => ({ pais, cantidad, pct: paisRowsBi.length > 0 ? Number(((cantidad / paisRowsBi.length) * 100).toFixed(1)) : 0 }));

  // ─── Planificador: salud operativa por tipo de alerta ─────────────────────
  const alertaCountMap = {};
  let pantallasConDeuda = 0;
  for (const r of alertaRows) {
    const alerta = (r.alertaReal || '').trim() || 'Sin novedad';
    alertaCountMap[alerta] = (alertaCountMap[alerta] || 0) + 1;
    if (r.debe) pantallasConDeuda += 1;
  }
  const planificadorAlertas = Object.entries(alertaCountMap)
    .sort((a, b) => b[1] - a[1])
    .map(([alerta, cantidad]) => ({ alerta, cantidad }));

  // ─── Ocupación de Cuentas Padre ────────────────────────────────────────────
  // La capacidad real de pantallas la define el PLANIFICADOR (suma de la
  // columna # por cuenta) — el campo `credito` de CuentaPadre NO representa
  // cupos de pantalla y no se usa aquí. Ocupada = pantalla con cliente
  // asignado; libre = registrada pero sin asignar (venta posible sin comprar
  // capacidad adicional).
  const ocupadosPorCuenta = {};
  for (const p of alertaRows) {
    const cid = p.cuentaId;
    if (!cid) continue;
    if (!ocupadosPorCuenta[cid]) ocupadosPorCuenta[cid] = { total: 0, ocupadas: 0 };
    const np = Number(p.pantallas) || 1;
    ocupadosPorCuenta[cid].total += np;
    const nombre = (String(p.nombre ?? '') + String(p.apellido ?? '')).trim();
    const nickname = (p.nickname || '').trim();
    const esLibre = nickname.toLowerCase().includes('libre') || (!nombre && !nickname);
    if (!esLibre) ocupadosPorCuenta[cid].ocupadas += np;
  }
  const ocupacionDetalle = Object.entries(ocupadosPorCuenta)
    .map(([cuentaId, d]) => ({
      cuentaId,
      capacidad: d.total,
      ocupadas: d.ocupadas,
      libres: Math.max(0, d.total - d.ocupadas),
      pctOcupacion: d.total > 0 ? Math.min(100, Math.round((d.ocupadas / d.total) * 100)) : 0,
    }))
    .sort((a, b) => a.pctOcupacion - b.pctOcupacion || b.libres - a.libres);
  const totalCapacidadCP = ocupacionDetalle.reduce((s, c) => s + c.capacidad, 0);
  const totalOcupadasCP  = ocupacionDetalle.reduce((s, c) => s + c.ocupadas,  0);
  const totalLibresCP    = Math.max(0, totalCapacidadCP - totalOcupadasCP);
  const pctOcupacionGlobal = totalCapacidadCP > 0 ? Math.round((totalOcupadasCP / totalCapacidadCP) * 100) : 0;

  // ─── LTV (Valor de Vida del Cliente) ─────────────────────────────────────
  // Sin CAC exacto, el LTV = ingreso histórico acumulado desde la primera
  // activación hasta la última transacción registrada (excluidas cortesías).
  // Es el techo de lo que vale invertir en retener a un cliente.
  const primeraActiv = {};
  const ultimaActiv  = {};
  const ingresosCli  = {};
  for (const v of ventas) {
    if (!v.fecha || !v.customerId) continue;
    if (v.tipoPago === 'Activacion Pantalla') {
      if (!primeraActiv[v.customerId] || v.fecha < primeraActiv[v.customerId])
        primeraActiv[v.customerId] = v.fecha;
    }
    if (v.tipoPago !== 'Cortesia') {
      if (!ultimaActiv[v.customerId] || v.fecha > ultimaActiv[v.customerId])
        ultimaActiv[v.customerId] = v.fecha;
      ingresosCli[v.customerId] = (ingresosCli[v.customerId] || 0) + (Number(v.precioVenta) || 0);
    }
  }
  const mesesEntreF = (f1, f2) => {
    const [d1, d2] = [new Date(f1), new Date(f2)];
    return Math.max(1, (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()));
  };
  const ltvRows = [];
  for (const cid of Object.keys(primeraActiv)) {
    const ingresos = ingresosCli[cid] || 0;
    const ultima   = ultimaActiv[cid];
    if (!ultima || ingresos === 0) continue;
    const meses = mesesEntreF(primeraActiv[cid], ultima);
    ltvRows.push({ cid, ingresos, meses, arpuMes: ingresos / meses });
  }
  const ltvSorted = ltvRows.map(c => c.ingresos).sort((a, b) => a - b);
  const qAt = (q) => ltvSorted.length > 0 ? Math.round(ltvSorted[Math.max(0, Math.floor(ltvSorted.length * q) - 1)] || 0) : 0;
  const ltvPromedio     = ltvRows.length > 0 ? Math.round(ltvRows.reduce((s, c) => s + c.ingresos, 0) / ltvRows.length) : 0;
  const vidaMeses       = ltvRows.length > 0 ? Number((ltvRows.reduce((s, c) => s + c.meses,   0) / ltvRows.length).toFixed(1)) : 0;
  const arpuMensualLtv  = ltvRows.length > 0 ? Math.round(ltvRows.reduce((s, c) => s + c.arpuMes, 0) / ltvRows.length) : 0;

  // Distribución por quintiles (5 segmentos iguales ordenados por LTV)
  const ltvDistribucion = (() => {
    if (!ltvSorted.length) return [];
    const n = ltvSorted.length;
    const slices = [
      { label: 'Q1 · bajo',  idx: [0,           Math.ceil(n * 0.2)] },
      { label: 'Q2',         idx: [Math.ceil(n * 0.2), Math.ceil(n * 0.4)] },
      { label: 'Q3 · medio', idx: [Math.ceil(n * 0.4), Math.ceil(n * 0.6)] },
      { label: 'Q4',         idx: [Math.ceil(n * 0.6), Math.ceil(n * 0.8)] },
      { label: 'Q5 · alto',  idx: [Math.ceil(n * 0.8), n] },
    ];
    return slices.map(s => ({
      label: s.label,
      cantidad: s.idx[1] - s.idx[0],
      maxLtv: Math.round(ltvSorted[s.idx[1] - 1] || 0),
    }));
  })();

  // Valor en riesgo: LTV histórico de clientes con pantallas vencidas / próximas
  const clientesRiesgoSet = new Set(
    alertaRows
      .filter(a => a.alertaReal === 'VENCIDO' || a.alertaReal === 'PROXIMO A VENCER')
      .map(a => a.customerId)
      .filter(Boolean)
  );
  const valorEnRiesgo = Math.round(
    ltvRows.filter(c => clientesRiesgoSet.has(c.cid)).reduce((s, c) => s + c.ingresos, 0)
  );

  // Momentum de ventas: variación promedio mes a mes de ingresos en los
  // últimos meses con actividad registrada — sirve como "velocímetro" de
  // corto plazo, complementario al CAGR (que mide tendencia estructural).
  const mesesConVentas = porMes.filter(m => m.numVentas > 0);
  const ultimosMeses = mesesConVentas.slice(-7);
  let sumaCrecMensual = 0;
  let conteoCrecMensual = 0;
  for (let i = 1; i < ultimosMeses.length; i++) {
    const prev = ultimosMeses[i - 1].ingresos;
    const cur = ultimosMeses[i].ingresos;
    if (prev > 0) {
      sumaCrecMensual += ((cur - prev) / prev) * 100;
      conteoCrecMensual++;
    }
  }
  const momentumVentasPct = conteoCrecMensual > 0 ? Number((sumaCrecMensual / conteoCrecMensual).toFixed(1)) : 0;

  // ─── Comparativo YTD (año corrido: Ene–mesActual vs mismo período año anterior) ──
  const todayLocal   = new Date();
  const anioHoy      = todayLocal.getFullYear();
  const mesHoy       = todayLocal.getMonth() + 1; // 1-based (Bogotá, por TZ env)
  const anioYTDAnt   = anioHoy - 1;
  const ingYTD       = ventas.filter(v => Number(v.anio) === anioHoy    && mesNum(v.mes) <= mesHoy).reduce((s, v) => s + (Number(v.precioVenta) || 0), 0);
  const cosYTD       = costos.filter(c => Number(c.anio) === anioHoy    && mesNum(c.mes) <= mesHoy).reduce((s, c) => s + Number(c.costoCOP || 0) + Number(c.impuesto4x100COP || 0), 0);
  const ingYTDAnt    = ventas.filter(v => Number(v.anio) === anioYTDAnt && mesNum(v.mes) <= mesHoy).reduce((s, v) => s + (Number(v.precioVenta) || 0), 0);
  const cosYTDAnt    = costos.filter(c => Number(c.anio) === anioYTDAnt && mesNum(c.mes) <= mesHoy).reduce((s, c) => s + Number(c.costoCOP || 0) + Number(c.impuesto4x100COP || 0), 0);
  const comparativoYTD = (ingYTD > 0 || ingYTDAnt > 0) ? {
    etiqueta:           `Ene–${MES_LABEL[mesHoy]}`,
    anioActual:          anioHoy,
    anioAnterior:        anioYTDAnt,
    ingresosActual:      Math.round(ingYTD),
    costosActual:        Math.round(cosYTD),
    ingresosAnterior:    Math.round(ingYTDAnt),
    costosAnterior:      Math.round(cosYTDAnt),
    crecimientoIngresosPct: ingYTDAnt > 0 ? Number((((ingYTD - ingYTDAnt) / ingYTDAnt) * 100).toFixed(1)) : null,
    crecimientoCostosPct:   cosYTDAnt > 0 ? Number((((cosYTD - cosYTDAnt) / cosYTDAnt) * 100).toFixed(1)) : null,
  } : null;

  // ─── Clientes en riesgo de churn: VENCIDO / PROXIMO A VENCER + LTV ───────
  const ltvByCid = {};
  for (const c of ltvRows) ltvByCid[c.cid] = c.ingresos;
  const riesgoAcc = {};
  for (const a of alertaRows) {
    if (!a.customerId) continue;
    if (a.alertaReal !== 'VENCIDO' && a.alertaReal !== 'PROXIMO A VENCER') continue;
    const nick = (a.nickname || '').toLowerCase();
    if (nick.includes('libre') || (!a.nombre && !a.apellido && !a.nickname)) continue;
    if (!riesgoAcc[a.customerId]) {
      riesgoAcc[a.customerId] = {
        customerId:   a.customerId,
        nombre:       `${a.nombre || ''} ${a.apellido || ''}`.trim() || a.nickname || 'Sin nombre',
        nickname:     a.nickname || '',
        alerta:       a.alertaReal,
        ltvHistorico: Math.round(ltvByCid[a.customerId] || 0),
        venceEl:       a.duracionReal || null,
        diasRestantes: a.diasRestantes ?? null,
      };
    }
    const acc = riesgoAcc[a.customerId];
    // Si tiene pantalla VENCIDA, escalar la alerta independientemente del orden
    if (a.alertaReal === 'VENCIDO') acc.alerta = 'VENCIDO';
    // Conservar la pantalla más urgente (menos días restantes) como referencia visible
    if (a.diasRestantes != null && (acc.diasRestantes == null || a.diasRestantes < acc.diasRestantes)) {
      acc.diasRestantes = a.diasRestantes;
      acc.venceEl = a.duracionReal || null;
    }
  }
  const clientesEnRiesgo = Object.values(riesgoAcc)
    .sort((a, b) => b.ltvHistorico - a.ltvHistorico)
    .slice(0, 20);

  const payload = {
    porAnio,
    porMes: porMesConMrr,
    tipoPago,
    mrrPorTipoPlan,
    paretoIngresos,
    bajasPorAnioDetalle,
    paisesClientes,
    planificadorAlertas,
    pantallasConDeuda,
    ocupacion: {
      totalCapacidad: totalCapacidadCP,
      totalOcupadas:  totalOcupadasCP,
      totalLibres:    totalLibresCP,
      pctOcupacionGlobal,
      detalle: ocupacionDetalle.slice(0, 30),
    },
    comparativoYTD,
    clientesEnRiesgo,
    ltv: {
      ltvPromedio,
      vidaPromedioMeses: vidaMeses,
      arpuMensualLtv,
      valorEnRiesgo,
      clientesEnRiesgoCount: clientesRiesgoSet.size,
      numClientes: ltvRows.length,
      percentiles: { p25: qAt(0.25), p50: qAt(0.5), p75: qAt(0.75), p90: qAt(0.9), max: ltvSorted[ltvSorted.length - 1] || 0 },
      distribucion: ltvDistribucion,
    },
    kpis: {
      ingresosTotales: Math.round(totalIngresos),
      costosTotales: totalCostos,
      margenTotal,
      margenPctTotal,
      ticketPromedio,
      tasaRenovacionPct,
      churnPct,
      anioActual: ultimo?.anio || null,
      anioAnterior: penultimo?.anio || null,
      crecimientoIngresosUltimo: ultimo?.crecimientoIngresosPct ?? null,
      crecimientoCostosUltimo: ultimo?.crecimientoCostosPct ?? null,
      margenPctUltimo: ultimo?.margenPct ?? null,
      margenPctAnterior: penultimo?.margenPct ?? null,
      // Rentabilidad
      markupPct,
      coberturaCostos,
      puntoEquilibrioVentas,
      // Ventas
      concentracionTop20Pct,
      numClientesCompradores,
      arpu,
      totalPantallas,
      ingresoPorPantalla,
      costoPorPantalla,
      momentumVentasPct,
      // MRR / ARR normalizados
      mrrActual,
      arrActual,
      mrrMesLabel: ultimoMesObj?.label || null,
      crecimientoMrrMomPct,
      momentumMrrPct,
    },
  };

  dashboardBiCache = { data: payload, expiresAt: Date.now() + DASHBOARD_BI_CACHE_TTL_MS };
  res.json(payload);
}));

// ============ ANÁLISIS FINANCIERO (EBITDA / OPEX / CAPEX / TIR) ============
// Lectura financiera del negocio con la información realmente registrada:
//  · Ingresos  = ventas de licencias + ventas de equipos
//  · OPEX      = recargas de créditos + impuesto 4x1000 (gasto operativo recurrente)
//  · COGS HW   = costo de adquisición de los equipos vendidos (campo `costo`)
//  · EBITDA    = Ingresos − OPEX − COGS HW  (proxy: no hay nómina/gastos admin registrados,
//                por lo que este EBITDA coincide con la utilidad bruta operativa)
//  · CAPEX     ≈ 0 registrado — negocio asset-light; se expone para transparencia
//  · TIR       = tasa interna de retorno de los flujos netos mensuales (bisección);
//                solo es calculable si la serie tiene al menos un flujo negativo
router.get('/dashboard-bi/finanzas', asyncHandler(async (_req, res) => {
  const [ventas, equipos, costos] = await Promise.all([
    Venta.findAll({ attributes: ['anio', 'mes', 'precioVenta'], raw: true }),
    VentaEquipo.findAll({ attributes: ['anio', 'mes', 'precioVenta', 'costo'], raw: true }),
    CostoPantalla.findAll({ attributes: ['anio', 'mes', 'costoCOP', 'impuesto4x100COP', 'trm', 'costoPantallaCOP'], raw: true }),
  ]);

  const MES_LABEL = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthKey = (anio, mes) => `${anio}-${String(mesNum(mes)).padStart(2, '0')}`;

  const meses = {};
  const ensure = (k) => {
    if (!meses[k]) meses[k] = { ingLicencias: 0, ingEquipos: 0, opex: 0, cogsEquipos: 0, trmSum: 0, trmN: 0 };
    return meses[k];
  };

  for (const v of ventas) {
    const k = monthKey(v.anio, v.mes);
    if (k.endsWith('-00')) continue;
    ensure(k).ingLicencias += Number(v.precioVenta) || 0;
  }
  for (const e of equipos) {
    const k = monthKey(e.anio, e.mes);
    if (k.endsWith('-00')) continue;
    const r = ensure(k);
    r.ingEquipos  += Number(e.precioVenta) || 0;
    r.cogsEquipos += Number(e.costo) || 0;
  }
  for (const c of costos) {
    const k = monthKey(c.anio, c.mes);
    if (k.endsWith('-00')) continue;
    const r = ensure(k);
    r.opex += (Number(c.costoCOP) || 0) + (Number(c.impuesto4x100COP) || 0);
    if (Number(c.trm) > 0) { r.trmSum += Number(c.trm); r.trmN += 1; }
  }

  let acumulado = 0;
  const serieMensual = Object.keys(meses).sort().map(k => {
    const m = meses[k];
    const [anio, mm] = k.split('-');
    const ingresos = Math.round(m.ingLicencias + m.ingEquipos);
    const opexM    = Math.round(m.opex);
    const cogsM    = Math.round(m.cogsEquipos);
    const ebitda   = ingresos - opexM - cogsM;
    acumulado += ebitda;
    return {
      key: k,
      label: `${MES_LABEL[Number(mm)]} ${anio.slice(2)}`,
      anio,
      ingresos,
      ingLicencias: Math.round(m.ingLicencias),
      ingEquipos:   Math.round(m.ingEquipos),
      opex: opexM,
      cogsEquipos: cogsM,
      ebitda,
      margenEbitdaPct: ingresos > 0 ? Number(((ebitda / ingresos) * 100).toFixed(1)) : null,
      flujoAcumulado: acumulado,
      trmPromedio: m.trmN > 0 ? Math.round(m.trmSum / m.trmN) : null,
    };
  });

  // ─── Agregación anual ──────────────────────────────────────────────────────
  const porAnioMap = {};
  for (const m of serieMensual) {
    if (!porAnioMap[m.anio]) porAnioMap[m.anio] = { anio: m.anio, ingresos: 0, opex: 0, cogsEquipos: 0, ebitda: 0 };
    const a = porAnioMap[m.anio];
    a.ingresos += m.ingresos; a.opex += m.opex; a.cogsEquipos += m.cogsEquipos; a.ebitda += m.ebitda;
  }
  let prevEbitda = null;
  const serieAnual = Object.values(porAnioMap).sort((a, b) => a.anio.localeCompare(b.anio)).map(a => {
    const margenEbitdaPct = a.ingresos > 0 ? Number(((a.ebitda / a.ingresos) * 100).toFixed(1)) : null;
    const opexRatioPct    = a.ingresos > 0 ? Number(((a.opex / a.ingresos) * 100).toFixed(1)) : null;
    const crecimientoEbitdaPct = prevEbitda != null && prevEbitda !== 0
      ? Number((((a.ebitda - prevEbitda) / Math.abs(prevEbitda)) * 100).toFixed(1)) : null;
    prevEbitda = a.ebitda;
    return { ...a, margenEbitdaPct, opexRatioPct, crecimientoEbitdaPct };
  });

  // ─── TIR de los flujos netos mensuales (bisección sobre VPN) ──────────────
  const flujos = serieMensual.map(m => m.ebitda);
  const hayNegativo = flujos.some(f => f < 0);
  const hayPositivo = flujos.some(f => f > 0);
  let tirMensualPct = null, tirAnualPct = null;
  if (hayNegativo && hayPositivo) {
    const vpn = (r) => flujos.reduce((s, f, t) => s + f / Math.pow(1 + r, t), 0);
    let lo = -0.99, hi = 10;
    if (vpn(lo) * vpn(hi) < 0) {
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (vpn(lo) * vpn(mid) <= 0) hi = mid; else lo = mid;
      }
      const r = (lo + hi) / 2;
      tirMensualPct = Number((r * 100).toFixed(2));
      tirAnualPct   = Number(((Math.pow(1 + r, 12) - 1) * 100).toFixed(1));
    }
  }

  // Payback: primer mes en el que el flujo acumulado se vuelve (y se queda) positivo
  let paybackMes = null;
  for (let i = 0; i < serieMensual.length; i++) {
    if (serieMensual[i].flujoAcumulado > 0) { paybackMes = { index: i + 1, label: serieMensual[i].label }; break; }
  }

  // ─── KPIs de cabecera ──────────────────────────────────────────────────────
  const totIngresos = serieMensual.reduce((s, m) => s + m.ingresos, 0);
  const totOpex     = serieMensual.reduce((s, m) => s + m.opex, 0);
  const totCogs     = serieMensual.reduce((s, m) => s + m.cogsEquipos, 0);
  const totEbitda   = totIngresos - totOpex - totCogs;
  const mesesConDatos = serieMensual.filter(m => m.ingresos > 0 || m.opex > 0);
  const roiSobreOpex  = totOpex > 0 ? Number((totEbitda / totOpex).toFixed(2)) : null;

  // Últimos 12 meses (LTM) para lectura de corto plazo
  const ltm = serieMensual.slice(-12);
  const ltmIngresos = ltm.reduce((s, m) => s + m.ingresos, 0);
  const ltmOpex     = ltm.reduce((s, m) => s + m.opex, 0);
  const ltmEbitda   = ltm.reduce((s, m) => s + m.ebitda, 0);

  res.json({
    serieMensual,
    serieAnual,
    kpis: {
      ebitdaHistorico: totEbitda,
      margenEbitdaPct: totIngresos > 0 ? Number(((totEbitda / totIngresos) * 100).toFixed(1)) : null,
      opexHistorico: totOpex,
      opexRatioPct: totIngresos > 0 ? Number(((totOpex / totIngresos) * 100).toFixed(1)) : null,
      cogsEquiposHistorico: totCogs,
      capexRegistrado: 0,
      tirMensualPct,
      tirAnualPct,
      paybackMes,
      roiSobreOpex,
      ebitdaPromedioMensual: mesesConDatos.length > 0 ? Math.round(totEbitda / mesesConDatos.length) : 0,
      ltm: {
        ingresos: ltmIngresos,
        opex: ltmOpex,
        ebitda: ltmEbitda,
        margenEbitdaPct: ltmIngresos > 0 ? Number(((ltmEbitda / ltmIngresos) * 100).toFixed(1)) : null,
      },
    },
  });
}));

// ============ ANÁLISIS FINANCIERO — EQUIPOS ============
router.get('/dashboard-bi/finanzas-equipos', asyncHandler(async (_req, res) => {
  const equipos = await VentaEquipo.findAll({
    attributes: ['anio', 'mes', 'precioVenta', 'costo', 'tipoFire', 'itemQuantity', 'tipoPago'],
    raw: true,
  });

  const MES_LABEL_ARR = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mKey = (anio, mes) => `${anio}-${String(mesNum(mes)).padStart(2, '0')}`;

  const totalIngresos  = Math.round(equipos.reduce((s, e) => s + (Number(e.precioVenta) || 0), 0));
  const totalCogs      = Math.round(equipos.reduce((s, e) => s + (Number(e.costo) || 0), 0));
  const totalRegistros = equipos.length;
  const sinCostoCount  = equipos.filter(e => !(Number(e.costo) > 0)).length;

  // Agregación mensual
  const porMesMap = {};
  for (const e of equipos) {
    const k = mKey(e.anio, e.mes);
    if (k.endsWith('-00')) continue;
    if (!porMesMap[k]) porMesMap[k] = { ingresos: 0, cogs: 0, unidades: 0 };
    porMesMap[k].ingresos += Number(e.precioVenta) || 0;
    porMesMap[k].cogs     += Number(e.costo) || 0;
    porMesMap[k].unidades += Number(e.itemQuantity) || 1;
  }
  const porMes = Object.keys(porMesMap).sort().map(k => {
    const [anio, mm] = k.split('-');
    const m   = porMesMap[k];
    const ing  = Math.round(m.ingresos);
    const cogs = Math.round(m.cogs);
    return {
      key: k, label: `${MES_LABEL_ARR[Number(mm)]} ${anio}`, anio,
      ingresos: ing, cogs, margen: ing - cogs,
      margenPct: ing > 0 ? Number((((ing - cogs) / ing) * 100).toFixed(1)) : null,
      unidades: Math.round(m.unidades),
    };
  });

  // Agregación por tipo de equipo (tipoFire)
  const porTipoMap = {};
  for (const e of equipos) {
    const tipo = (e.tipoFire || 'Sin clasificar').trim() || 'Sin clasificar';
    if (!porTipoMap[tipo]) porTipoMap[tipo] = { tipo, ingresos: 0, cogs: 0, unidades: 0 };
    porTipoMap[tipo].ingresos += Number(e.precioVenta) || 0;
    porTipoMap[tipo].cogs     += Number(e.costo) || 0;
    porTipoMap[tipo].unidades += Number(e.itemQuantity) || 1;
  }
  const porTipo = Object.values(porTipoMap)
    .map(t => ({
      tipo: t.tipo,
      ingresos: Math.round(t.ingresos),
      cogs:     Math.round(t.cogs),
      margen:   Math.round(t.ingresos - t.cogs),
      margenPct: t.ingresos > 0 ? Number((((t.ingresos - t.cogs) / t.ingresos) * 100).toFixed(1)) : null,
      unidades: Math.round(t.unidades),
      pct: totalIngresos > 0 ? Number(((t.ingresos / totalIngresos) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.ingresos - a.ingresos);

  res.json({
    kpis: {
      totalIngresos,
      totalCogs,
      margenBruto:    totalIngresos - totalCogs,
      margenBrutoPct: totalIngresos > 0 ? Number((((totalIngresos - totalCogs) / totalIngresos) * 100).toFixed(1)) : null,
      ticketPromedio: totalRegistros > 0 ? Math.round(totalIngresos / totalRegistros) : 0,
      totalRegistros,
      sinCostoCount,
      sinCostoPct: totalRegistros > 0 ? Number(((sinCostoCount / totalRegistros) * 100).toFixed(0)) : 0,
    },
    porMes,
    porTipo,
  });
}));

// ============ COHORT RETENTION ANALYSIS ============
router.get('/dashboard-bi/cohorts', asyncHandler(async (_req, res) => {
  const MAX_MESES = 18;

  const ventas = await Venta.findAll({
    attributes: ['customerId', 'fecha', 'tipoPago', 'tipoPlan'],
    where: { fecha: { [Op.not]: null } },
  });

  // Fecha de corte: máximo mes con datos
  const allFechas = ventas.map(v => v.fecha).filter(Boolean).sort();
  const maxMes = allFechas[allFechas.length - 1]
    ? allFechas[allFechas.length - 1].slice(0, 7)
    : null;
  if (!maxMes) return res.json({ cohortes: [], curvaPromedio: [], resumen: {} });

  // Mes de primera activación por cliente (cohorte de entrada)
  const primeraActivacion = {};
  for (const v of ventas) {
    if (v.tipoPago !== 'Activacion Pantalla') continue;
    const ym = v.fecha.slice(0, 7);
    if (!primeraActivacion[v.customerId] || ym < primeraActivacion[v.customerId]) {
      primeraActivacion[v.customerId] = ym;
    }
  }

  // Meses con actividad por cliente (excluye cortesías)
  const actividadPorCliente = {};
  for (const v of ventas) {
    if (v.tipoPago === 'Cortesia') continue;
    const ym = v.fecha.slice(0, 7);
    if (!actividadPorCliente[v.customerId]) actividadPorCliente[v.customerId] = new Set();
    actividadPorCliente[v.customerId].add(ym);
  }

  // Suma N meses a YYYY-MM → YYYY-MM
  const addMeses = (ym, n) => {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Actividad ajustada: expande el período de servicio según tipoPlan
  // Plan Mensual = 1 mes, Plan Semestral = 6+1 gratis = 7 meses, Plan Anual = 12+2 gratis = 14 meses
  const DURACION_PLAN = { 'Plan Mensual': 1, 'Plan Semestral': 7, 'Plan Anual': 14 };
  const actividadAjustadaPorCliente = {};
  for (const v of ventas) {
    if (v.tipoPago === 'Cortesia') continue;
    const ym = v.fecha.slice(0, 7);
    const dur = DURACION_PLAN[v.tipoPlan] || 1;
    if (!actividadAjustadaPorCliente[v.customerId]) actividadAjustadaPorCliente[v.customerId] = new Set();
    for (let i = 0; i < dur; i++) actividadAjustadaPorCliente[v.customerId].add(addMeses(ym, i));
  }

  // Distribución por tipo de plan
  const planCounts = {};
  for (const v of ventas) {
    if (v.tipoPago === 'Cortesia') continue;
    const plan = v.tipoPlan || 'Sin clasificar';
    planCounts[plan] = (planCounts[plan] || 0) + 1;
  }
  const totalVtasPlanes = Object.values(planCounts).reduce((s, n) => s + n, 0);
  const distribucionPlanes = Object.entries(planCounts)
    .map(([plan, count]) => ({ plan, count, pct: totalVtasPlanes > 0 ? Math.round((count / totalVtasPlanes) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  // Agrupar clientes por mes de cohorte
  const cohortMap = {};
  for (const [cid, mes] of Object.entries(primeraActivacion)) {
    if (!cohortMap[mes]) cohortMap[mes] = [];
    cohortMap[mes].push(cid);
  }

  const cohortes = Object.entries(cohortMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, clientes]) => {
      const retencion = [];
      for (let n = 0; n <= MAX_MESES; n++) {
        const target = addMeses(mes, n);
        if (target > maxMes) {
          retencion.push(null);
        } else {
          const retenidos = clientes.filter(cid => actividadPorCliente[cid]?.has(target)).length;
          retencion.push(clientes.length > 0 ? Math.round((retenidos / clientes.length) * 100) : 0);
        }
      }
      return { mes, clientesIniciales: clientes.length, retencion };
    });

  // Cohortes ajustadas por duración de plan
  const cohortesAjustadas = Object.entries(cohortMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, clientes]) => {
      const retencion = [];
      for (let n = 0; n <= MAX_MESES; n++) {
        const target = addMeses(mes, n);
        if (target > maxMes) {
          retencion.push(null);
        } else {
          const retenidos = clientes.filter(cid => actividadAjustadaPorCliente[cid]?.has(target)).length;
          retencion.push(clientes.length > 0 ? Math.round((retenidos / clientes.length) * 100) : 0);
        }
      }
      return { mes, clientesIniciales: clientes.length, retencion };
    });

  // Curva promedio: media de los % no-nulos en cada posición N
  const curvaPromedio = [];
  for (let n = 0; n <= MAX_MESES; n++) {
    const vals = cohortes.map(c => c.retencion[n]).filter(v => v !== null);
    curvaPromedio.push(vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null);
  }

  // Curva promedio ajustada por plan
  const curvaPromedioAjustada = [];
  for (let n = 0; n <= MAX_MESES; n++) {
    const vals = cohortesAjustadas.map(c => c.retencion[n]).filter(v => v !== null);
    curvaPromedioAjustada.push(vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null);
  }

  // Resumen de retención promedio en hitos clave
  const avgAt = (n) => {
    const vals = cohortes.map(c => c.retencion[n]).filter(v => v !== null);
    return vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  };
  const avgAtAj = (n) => {
    const vals = cohortesAjustadas.map(c => c.retencion[n]).filter(v => v !== null);
    return vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  };

  res.json({
    cohortes,
    cohortesAjustadas,
    curvaPromedio,
    curvaPromedioAjustada,
    distribucionPlanes,
    maxMes,
    resumen: { mes1: avgAt(1), mes3: avgAt(3), mes6: avgAt(6), mes12: avgAt(12) },
    resumenAjustado: { mes1: avgAtAj(1), mes3: avgAtAj(3), mes6: avgAtAj(6), mes12: avgAtAj(12) },
  });
}));

// ============ INGRESO POR CLIENTE (detalle de ARPU) ============
router.get('/dashboard-bi/ingresos-por-cliente', asyncHandler(async (_req, res) => {
  const ventas = await Venta.findAll({
    attributes: ['customerId', 'nombre', 'apellido', 'nickname', 'precioVenta', 'fecha'],
    raw: true,
  });

  const porCliente = {};
  for (const v of ventas) {
    const cid = v.customerId || 'SIN_ID';
    if (!porCliente[cid]) {
      porCliente[cid] = { customerId: cid, nombre: '', apellido: '', nickname: '', totalIngresos: 0, numVentas: 0, ultimaCompra: null };
    }
    const e = porCliente[cid];
    e.totalIngresos += Number(v.precioVenta) || 0;
    e.numVentas += 1;
    if (!e.ultimaCompra || (v.fecha && v.fecha > e.ultimaCompra)) {
      e.ultimaCompra = v.fecha || e.ultimaCompra;
      if (v.nombre) e.nombre = v.nombre;
      if (v.apellido) e.apellido = v.apellido;
      if (v.nickname) e.nickname = v.nickname;
    }
  }

  const totalIngresos = Object.values(porCliente).reduce((s, e) => s + e.totalIngresos, 0);

  const clientes = Object.values(porCliente)
    .map(e => ({
      customerId: e.customerId,
      cliente: [e.nombre, e.apellido].filter(Boolean).join(' ').trim() || e.nickname || e.customerId,
      nickname: e.nickname,
      numVentas: e.numVentas,
      totalIngresos: Math.round(e.totalIngresos),
      ticketPromedio: e.numVentas > 0 ? Math.round(e.totalIngresos / e.numVentas) : 0,
      ultimaCompra: e.ultimaCompra,
      pctTotal: totalIngresos > 0 ? Number(((e.totalIngresos / totalIngresos) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.totalIngresos - a.totalIngresos);

  res.json({
    totalIngresos: Math.round(totalIngresos),
    numClientes: clientes.length,
    arpu: clientes.length > 0 ? Math.round(totalIngresos / clientes.length) : 0,
    clientes,
  });
}));

// ============ DETALLE DE VENTAS DE UN CLIENTE (drill-down de ARPU) ============
router.get('/dashboard-bi/ingresos-por-cliente/:customerId', asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const where = customerId === 'SIN_ID' ? { customerId: null } : { customerId };

  const ventas = await Venta.findAll({
    where,
    attributes: ['idVM', 'fecha', 'tipoPago', 'tipoPlan', 'precioVenta', 'nickname', 'cuenta', 'cuentaId', 'medioPago'],
    order: [['fecha', 'DESC']],
    raw: true,
  });

  res.json({
    customerId,
    ventas: ventas.map(v => ({
      idVM: v.idVM,
      fecha: v.fecha,
      tipoPago: v.tipoPago,
      tipoPlan: v.tipoPlan,
      precioVenta: Math.round(Number(v.precioVenta) || 0),
      nickname: v.nickname,
      cuenta: v.cuenta || v.cuentaId || '',
      medioPago: v.medioPago,
    })),
  });
}));

module.exports = router;
