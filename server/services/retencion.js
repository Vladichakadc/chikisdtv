// Análisis de retención: "de los clientes que activamos, ¿cuántos siguen con
// nosotros N meses después?".
//
// Reglas (una sola definición, la misma en toda la página):
//   · Cohorte      → mes de la PRIMERA "Activacion Pantalla" del cliente.
//   · Plan inicial → tipoPlan de esa primera activación.
//   · Cobertura    → cada venta (salvo cortesías) cubre los meses de su plan:
//                    Mensual 1, Semestral 6+1 = 7, Anual 12+2 = 14; los planes
//                    con forma "N + M" (p. ej. "3+1 Mundial") cubren N+M meses.
//   · Sigue con nosotros en el mes N → su cobertura llega hasta ese mes o más
//                    allá. Es una curva de supervivencia: solo baja, nunca sube
//                    (un cliente que pagó tarde no "revive" la curva).
//   · Corte        → último mes CERRADO: el mes en curso no se mide, para no
//                    contar como perdidos a los mensuales que aún no renuevan.
//   · Promedios    → curva de supervivencia (Kaplan-Meier) sobre todos los
//                    clientes: cada mes pesa por los clientes que lo vivieron
//                    (una cohorte de 2 clientes no pesa lo mismo que una de 40).
const { Op } = require('sequelize');
const { Venta } = require('../models');

const MAX_MESES = 18;
const HITOS = [1, 3, 6, 12];
// Por plan también se mide a 18 meses: el anual (12 + 2) solo se pone a prueba en el mes 14
const HITOS_PLAN = [6, 12, 18];
const MESES_PLAN = { 'Plan Mensual': 1, 'Plan Semestral': 7, 'Plan Anual': 14 };
const PLANES_PRINCIPALES = ['Plan Mensual', 'Plan Semestral', 'Plan Anual'];

function mesesDePlan(tipoPlan) {
  const t = String(tipoPlan || '').trim();
  if (MESES_PLAN[t]) return MESES_PLAN[t];
  const m = t.match(/(\d+)\s*(?:meses?)?\s*\+\s*(\d+)/i);
  if (m) return Number(m[1]) + Number(m[2]);
  return 1;
}

const ym = (fecha) => String(fecha).slice(0, 7);
function sumarMeses(mes, n) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function mesesEntre(a, b) {
  const [ya, ma] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma);
}
function ultimoMesCerrado(hoy = new Date()) {
  const d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

// Cálculo puro (recibe las ventas): fácil de probar
function calcularRetencion(ventas, { corte = ultimoMesCerrado() } = {}) {
  const clientes = new Map(); // customerId → { cohorte, plan, hasta }
  // 1. Cohorte y plan inicial
  const ordenadas = ventas.filter(v => v.fecha && v.customerId).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  for (const v of ordenadas) {
    if (v.tipoPago !== 'Activacion Pantalla') continue;
    const id = String(v.customerId).trim();
    if (!clientes.has(id)) clientes.set(id, { cohorte: ym(v.fecha), plan: v.tipoPlan || 'Sin clasificar', hasta: null });
  }
  // 2. Hasta dónde llega la cobertura de cada cliente
  for (const v of ordenadas) {
    if (v.tipoPago === 'Cortesia') continue;
    const c = clientes.get(String(v.customerId).trim());
    if (!c) continue;
    const fin = sumarMeses(ym(v.fecha), mesesDePlan(v.tipoPlan) - 1);
    if (!c.hasta || fin > c.hasta) c.hasta = fin;
  }

  // Solo cohortes que ya cerraron su mes de entrada
  const medibles = [...clientes.values()].filter(c => c.cohorte <= corte);
  const sigueEn = (c, n) => {
    const objetivo = sumarMeses(c.cohorte, n);
    if (objetivo > corte) return null; // aún no transcurre
    return c.hasta >= objetivo;
  };

  // Salidas mes a mes: de los que seguían al inicio del mes N (y cuyo mes N ya
  // transcurrió), cuántos no llegaron. Es la "tasa de abandono" de ese mes.
  function salidasDe(grupo) {
    const out = [];
    for (let n = 1; n <= MAX_MESES; n++) {
      let base = 0, seVan = 0;
      for (const c of grupo) {
        const antes = sigueEn(c, n - 1), ahora = sigueEn(c, n);
        if (antes !== true || ahora === null) continue;
        base += 1; if (!ahora) seVan += 1;
      }
      out.push({ mes: n, base, seVan, pct: pct(seVan, base) });
    }
    return out;
  }

  // Curva de supervivencia (Kaplan-Meier): S(N) = S(N-1) × (1 − abandono del mes N).
  // Combina cohortes de distinta antigüedad sin que la curva "suba" por mezcla.
  // minBase: en grupos chicos, los meses vividos por pocos clientes no se dibujan
  function curva(grupo, minBase = 1) {
    const sal = salidasDe(grupo);
    const puntos = [{ mes: 0, base: grupo.length, siguen: grupo.length, pct: grupo.length ? 100 : null }];
    let s = 1;
    for (const x of sal) {
      if (x.base > 0) s *= 1 - x.seVan / x.base;
      puntos.push({ mes: x.mes, base: x.base, siguen: x.base - x.seVan, pct: x.base >= minBase ? Math.round(s * 1000) / 10 : null });
    }
    return puntos;
  }

  const medidosEn = (grupo, n) => grupo.filter(c => sigueEn(c, n) !== null).length;
  const general = curva(medibles);
  const salidas = salidasDe(medibles);

  // Por plan inicial
  const porPlan = PLANES_PRINCIPALES.map(plan => {
    const grupo = medibles.filter(c => c.plan === plan);
    const cv = curva(grupo, 5);
    return {
      plan, clientes: grupo.length,
      // Con menos de 5 clientes medidos el porcentaje no es confiable
      hitos: Object.fromEntries(HITOS_PLAN.map(h => [h, medidosEn(grupo, h) >= 5 ? cv[h].pct : null])),
      medidos: Object.fromEntries(HITOS_PLAN.map(h => [h, medidosEn(grupo, h)])),
      curva: cv.map(p => p.pct),
    };
  }).filter(p => p.clientes > 0);

  // Curva por año de activación: ¿los clientes nuevos se quedan más o menos
  // que los de años anteriores?
  const anios = [...new Set(medibles.map(c => c.cohorte.slice(0, 4)))].sort();
  const porAnio = anios.map(anio => {
    const grupo = medibles.filter(c => c.cohorte.startsWith(anio));
    return { anio, clientes: grupo.length, curva: curva(grupo, 5).map(p => p.pct) };
  }).filter(a => a.clientes >= 5);

  // Movimiento mes a mes (calendario): llegan (primera activación), se van
  // (el mes siguiente al último mes cubierto) y clientes con servicio al cierre
  const primerMes = medibles.map(c => c.cohorte).sort()[0];
  const movimientos = [];
  if (primerMes) {
    for (let mes = primerMes; mes <= corte; mes = sumarMeses(mes, 1)) {
      let llegan = 0, seVan = 0, conServicio = 0;
      for (const c of medibles) {
        if (c.cohorte === mes) llegan += 1;
        if (c.hasta < corte && sumarMeses(c.hasta, 1) === mes) seVan += 1;
        if (c.cohorte <= mes && c.hasta >= mes) conServicio += 1;
      }
      movimientos.push({ mes, llegan, seVan, neto: llegan - seVan, conServicio });
    }
  }

  // Antigüedad de quienes siguen hoy
  const TRAMOS = [
    { tramo: 'Menos de 3 meses', hasta: 2 },
    { tramo: '3 a 6 meses', hasta: 6 },
    { tramo: '7 a 12 meses', hasta: 12 },
    { tramo: '1 a 2 años', hasta: 24 },
    { tramo: 'Más de 2 años', hasta: Infinity },
  ];
  const antiguedad = TRAMOS.map(t => ({ tramo: t.tramo, clientes: 0 }));
  for (const c of medibles) {
    if (c.hasta < corte) continue;
    const meses = mesesEntre(c.cohorte, corte);
    const i = TRAMOS.findIndex(t => meses <= t.hasta);
    antiguedad[i].clientes += 1;
  }

  // Cohortes (para la tabla de detalle)
  const porCohorte = new Map();
  for (const c of medibles) {
    if (!porCohorte.has(c.cohorte)) porCohorte.set(c.cohorte, []);
    porCohorte.get(c.cohorte).push(c);
  }
  const cohortes = [...porCohorte.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, grupo]) => ({
    mes,
    clientes: grupo.length,
    siguenHoy: grupo.filter(c => c.hasta >= corte).length,
    // Dentro de una cohorte todos tienen la misma antigüedad: basta la proporción
    retencion: Array.from({ length: MAX_MESES + 1 }, (_, n) => {
      const marcas = grupo.map(c => sigueEn(c, n));
      if (marcas[0] === null) return null;
      return pct(marcas.filter(Boolean).length, grupo.length);
    }),
  }));

  // Vida mediana: primer mes en que sigue menos de la mitad
  const mediana = general.find(p => p.base >= 10 && p.pct != null && p.pct < 50);
  const momentoCritico = salidas.filter(s => s.base >= 10).sort((a, b) => b.pct - a.pct)[0] || null;

  return {
    corte,
    reglas: { mesesPlan: MESES_PLAN, maxMeses: MAX_MESES },
    totalClientes: medibles.length,
    siguenHoy: medibles.filter(c => c.hasta >= corte).length,
    // medidos = clientes que ya cumplieron ese mes de antigüedad
    hitos: HITOS.map(h => ({ mes: h, pct: general[h].pct, medidos: medidosEn(medibles, h) })),
    curva: general,
    salidas,
    porPlan,
    porAnio,
    movimientos,
    antiguedad,
    cohortes,
    vidaMedianaMeses: mediana ? mediana.mes : null,
    momentoCritico,
    mesesCohorte: mesesEntre(medibles.map(c => c.cohorte).sort()[0] || corte, corte) + 1,
  };
}

async function analisisRetencion(opciones) {
  const ventas = await Venta.findAll({
    attributes: ['customerId', 'fecha', 'tipoPago', 'tipoPlan'],
    where: { fecha: { [Op.not]: null } },
    raw: true,
  });
  return calcularRetencion(ventas, opciones);
}

module.exports = { analisisRetencion, calcularRetencion, mesesDePlan, ultimoMesCerrado, HITOS };
