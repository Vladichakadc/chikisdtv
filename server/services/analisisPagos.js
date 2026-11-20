// Análisis de Pagos: ¿cuánto entra, cuándo, por qué canal, de qué planes y de
// quién? Todo en pesos y por FECHA DEL PAGO (Venta.fecha), que es cuando la
// plata entra a caja (el "mes facturado" puede ser otro).
//
// Reglas:
//   · Ingreso real = toda venta salvo "Cortesia" (regalo, $0) y "Cambio de
//     Plan" (registro administrativo): la misma exclusión del Dashboard.
//   · Los comparativos usan meses CERRADOS: el mes en curso va aparte, con
//     proyección a fin de mes por ritmo diario.
//   · Tipo de pago: Renovación (cliente que ya estaba) · Activación (pantalla
//     nueva) · Otros.
//   · Medios en dólares (USD, PayPal, Western Union) ya vienen convertidos a
//     pesos en la venta.
const { Venta } = require('../models');
const { enCache } = require('../utils/cacheDashboard');

const esIngresoReal = (v) => v.tipoPago !== 'Cortesia' && v.tipoPago !== 'Cambio de Plan';
const ym = (f) => String(f || '').slice(0, 7);
const hoyISO = () => new Date().toLocaleDateString('en-CA');
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
const variacion = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : null);
function sumarMeses(mes, n) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const diasDelMes = (mes) => { const [y, m] = mes.split('-').map(Number); return new Date(y, m, 0).getDate(); };

const tipoDe = (t) => (/^renov/i.test(t || '') ? 'renovacion' : /^activ/i.test(t || '') ? 'activacion' : 'otros');
const familiaPlan = (p) => {
  const t = String(p || '');
  if (/mensual/i.test(t)) return 'Mensual';
  if (/semestral/i.test(t)) return 'Semestral';
  if (/anual/i.test(t)) return 'Anual';
  return t.trim() ? 'Promociones' : 'Sin plan';
};
const medioNormal = (m) => {
  const t = String(m || '').trim();
  if (!t) return 'Sin registrar';
  if (/^nu$/i.test(t)) return 'Nu';
  if (/^paypal$/i.test(t)) return 'PayPal';
  if (/wester/i.test(t)) return 'Western Union';
  return t;
};
const esUSD = (m) => /(^|[^a-z])(usd|d[oó]lar|paypal|western?\s*union)/i.test(String(m || ''));
const clienteDe = (v) => String(v.customerId || '').trim() || (v.nickname ? `nick:${String(v.nickname).trim().toLowerCase()}` : null);

const TRAMOS_DIA = [
  { tramo: '1 al 5', hasta: 5 }, { tramo: '6 al 10', hasta: 10 }, { tramo: '11 al 15', hasta: 15 },
  { tramo: '16 al 20', hasta: 20 }, { tramo: '21 al 25', hasta: 25 }, { tramo: '26 al 31', hasta: 31 },
];

function resumenDe(lista) {
  const ingresos = lista.reduce((s, v) => s + v.monto, 0);
  return { ingresos: Math.round(ingresos), ventas: lista.length, ticket: lista.length ? Math.round(ingresos / lista.length) : 0 };
}

// Filtros (todos opcionales):
//   · variables → medios, tipos (renovacion|activacion|otros), planes: se
//     aplican a TODO (tarjetas, serie, comparativos y distribuciones);
//   · período   → periodo '12m' (por defecto) | 'todo' | 'personalizado' con
//     anios ['2025', …] y meses [1..12]: definen la "selección" que muestran
//     las gráficas de distribución, la serie, el año contra año y el mapa.
//     Las tarjetas siguen comparando meses cerrados.
function normalizarFiltros(f = {}) {
  const lista = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map(x => String(x).trim()).filter(Boolean);
  const meses = lista(f.meses).map(Number).filter(n => n >= 1 && n <= 12);
  const anios = lista(f.anios).filter(a => /^\d{4}$/.test(a));
  let periodo = ['12m', 'todo', 'personalizado'].includes(f.periodo) ? f.periodo : '12m';
  if ((anios.length || meses.length) && periodo !== 'personalizado') periodo = 'personalizado';
  return { medios: lista(f.medios), tipos: lista(f.tipos), planes: lista(f.planes), periodo, anios, meses };
}

function calcularAnalisisPagos(ventas, { hoy = hoyISO(), filtros: filtrosEntrada } = {}) {
  const filtros = normalizarFiltros(filtrosEntrada);
  const todos = ventas
    .filter(v => v.fecha && esIngresoReal(v))
    .map(v => ({
      fecha: String(v.fecha).slice(0, 10), mes: ym(v.fecha), monto: Number(v.precioVenta) || 0,
      tipo: tipoDe(v.tipoPago), plan: familiaPlan(v.tipoPlan), medio: medioNormal(v.medioPago),
      usd: esUSD(v.medioPago), cliente: clienteDe(v), nombre: String([v.nombre, v.apellido].filter(Boolean).join(' ') || v.nickname || '').trim(),
    }))
    .filter(v => v.fecha <= hoy);

  // Opciones de los filtros (sin filtrar), ordenadas por recaudo
  const ordenarPor = (clave) => {
    const m = new Map();
    for (const p of todos) m.set(p[clave], (m.get(p[clave]) || 0) + p.monto);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  };
  const opciones = {
    anios: [...new Set(todos.map(p => p.fecha.slice(0, 4)))].sort().reverse(),
    medios: ordenarPor('medio'),
    planes: ordenarPor('plan'),
    tipos: ['renovacion', 'activacion', 'otros'].filter(t => todos.some(p => p.tipo === t)),
  };
  const pagos = todos.filter(p => (!filtros.medios.length || filtros.medios.includes(p.medio))
    && (!filtros.tipos.length || filtros.tipos.includes(p.tipo))
    && (!filtros.planes.length || filtros.planes.includes(p.plan)));

  const mesHoy = ym(hoy);
  const corte = sumarMeses(mesHoy, -1); // último mes cerrado
  const desde12 = sumarMeses(corte, -11);
  const desde24 = sumarMeses(corte, -23);
  const ult12 = pagos.filter(p => p.mes >= desde12 && p.mes <= corte);
  const ant12 = pagos.filter(p => p.mes >= desde24 && p.mes < desde12);
  const enMes = (m) => pagos.filter(p => p.mes === m);

  // ── Serie mensual: 24 meses cerrados + mes en curso ──
  const meses = [];
  for (let m = desde24; m <= mesHoy; m = sumarMeses(m, 1)) meses.push(m);
  const filaSerie = (m) => {
    const g = enMes(m);
    const r = resumenDe(g);
    const fila = { mes: m, ...r, parcial: m === mesHoy };
    for (const t of ['renovacion', 'activacion', 'otros']) fila[t] = Math.round(g.filter(p => p.tipo === t).reduce((s, p) => s + p.monto, 0));
    return fila;
  };
  const serie24 = meses.map(filaSerie);
  const sparkline = serie24.filter(s => !s.parcial).slice(-12).map(s => ({ mes: s.mes, ingresos: s.ingresos }));

  // ── Mes en curso y proyección ──
  const dia = Number(hoy.slice(8, 10));
  const enCurso = resumenDe(enMes(mesHoy));
  const proyeccion = dia > 0 ? Math.round((enCurso.ingresos / dia) * diasDelMes(mesHoy)) : 0;
  // A la misma altura del mes anterior (para comparar ritmo)
  const mesAnt = corte;
  const mismaAltura = Math.round(enMes(mesAnt).filter(p => Number(p.fecha.slice(8, 10)) <= dia).reduce((s, p) => s + p.monto, 0));

  // ── Último mes cerrado ──
  const rCorte = resumenDe(enMes(corte));
  const rMesPrevio = resumenDe(enMes(sumarMeses(corte, -1)));
  const rMismoMesAnioAnt = resumenDe(enMes(sumarMeses(corte, -12)));

  // ── 12 meses ──
  const r12 = resumenDe(ult12);
  const rAnt12 = resumenDe(ant12);
  const porTipo12 = Object.fromEntries(['renovacion', 'activacion', 'otros'].map(t => {
    const g = ult12.filter(p => p.tipo === t);
    return [t, { ...resumenDe(g), pctIngresos: pct(g.reduce((s, p) => s + p.monto, 0), r12.ingresos) }];
  }));
  const activacionesAnt12 = ant12.filter(p => p.tipo === 'activacion').length;

  // Clientes que pagaron y recurrencia (2+ pagos en 12 meses)
  const pagosPorCliente = new Map();
  for (const p of ult12) if (p.cliente) pagosPorCliente.set(p.cliente, (pagosPorCliente.get(p.cliente) || 0) + 1);
  const clientes12 = pagosPorCliente.size;
  const recurrentes12 = [...pagosPorCliente.values()].filter(n => n >= 2).length;
  const clientesAnt12 = new Set(ant12.map(p => p.cliente).filter(Boolean)).size;

  // ── Distribuciones (12 meses e historial) ──
  function distribuciones(lista) {
    const total = lista.reduce((s, p) => s + p.monto, 0);
    const agrupar = (clave) => {
      const m = new Map();
      for (const p of lista) {
        const k = p[clave];
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(p);
      }
      return [...m.entries()].map(([nombre, g]) => ({ nombre, ...resumenDe(g), pct: pct(g.reduce((s, p) => s + p.monto, 0), total) }))
        .sort((a, b) => b.ingresos - a.ingresos);
    };
    const usd = lista.filter(p => p.usd);
    // Día del mes en que pagan
    const dias = TRAMOS_DIA.map((t, i) => {
      const desde = i ? TRAMOS_DIA[i - 1].hasta : 0;
      const g = lista.filter(p => { const d = Number(p.fecha.slice(8, 10)); return d > desde && d <= t.hasta; });
      return { tramo: t.tramo, ...resumenDe(g), pct: pct(g.reduce((s, p) => s + p.monto, 0), total) };
    });
    // Concentración por cliente (Pareto)
    const porCliente = new Map();
    for (const p of lista) {
      if (!p.cliente) continue;
      const c = porCliente.get(p.cliente) || { cliente: p.cliente, nombre: p.nombre || p.cliente, ingresos: 0, ventas: 0 };
      c.ingresos += p.monto; c.ventas += 1;
      if (p.nombre) c.nombre = p.nombre;
      porCliente.set(p.cliente, c);
    }
    const ranking = [...porCliente.values()].sort((a, b) => b.ingresos - a.ingresos);
    let acum = 0;
    const conAcum = ranking.map(c => { acum += c.ingresos; return { ...c, ingresos: Math.round(c.ingresos), pct: pct(c.ingresos, total), pctAcum: pct(acum, total) }; });
    const n80 = (conAcum.findIndex(c => c.pctAcum >= 80) + 1) || conAcum.length;
    const top10 = conAcum.slice(0, 10).reduce((s, c) => s + c.ingresos, 0);
    return {
      total: Math.round(total),
      medios: agrupar('medio'),
      planes: agrupar('plan'),
      dias,
      usd: { ...resumenDe(usd), pct: pct(usd.reduce((s, p) => s + p.monto, 0), total) },
      sinMedio: { ventas: lista.filter(p => p.medio === 'Sin registrar').length, pctVentas: pct(lista.filter(p => p.medio === 'Sin registrar').length, lista.length) },
      clientes: { total: conAcum.length, n80, pctN80: pct(n80, conAcum.length), pctTop10: pct(top10, total), top: conAcum.slice(0, 15) },
    };
  }

  // ── Estacionalidad: año × mes ──
  // ── Selección del período ──
  const personalizado = filtros.periodo === 'personalizado';
  const enAnios = (a) => !filtros.anios.length || filtros.anios.includes(a);
  const enMesesSel = (m) => !filtros.meses.length || filtros.meses.includes(Number(m.slice(5, 7)));
  const seleccion = filtros.periodo === 'todo' ? pagos
    : personalizado ? pagos.filter(p => enAnios(p.fecha.slice(0, 4)) && enMesesSel(p.mes))
      : ult12;
  // Serie de la selección: todos los meses del rango (también los que no
  // tuvieron pagos), respetando los años y meses elegidos
  const mesesDesde = (desde, hasta, incluir = () => true) => {
    const out = [];
    for (let m = desde; m <= hasta; m = sumarMeses(m, 1)) if (incluir(m)) out.push(filaSerie(m));
    return out;
  };
  let serie = serie24;
  if (personalizado) {
    const ms = pagos.map(p => p.mes).filter(m => enAnios(m.slice(0, 4)) && enMesesSel(m)).sort();
    serie = ms.length ? mesesDesde(ms[0], ms[ms.length - 1], (m) => enAnios(m.slice(0, 4)) && enMesesSel(m)) : [];
  } else if (filtros.periodo === 'todo') {
    const ms = pagos.map(p => p.mes).sort();
    serie = ms.length ? mesesDesde(ms[0], mesHoy) : [];
  }

  const anios = [...new Set(pagos.map(p => p.fecha.slice(0, 4)))].sort().filter(enAnios);
  const estacionalidad = anios.map(a => ({
    anio: a,
    meses: Array.from({ length: 12 }, (_, i) => {
      const m = `${a}-${String(i + 1).padStart(2, '0')}`;
      if (m > mesHoy || !enMesesSel(m)) return null;
      return { mes: m, ingresos: Math.round(enMes(m).reduce((s, p) => s + p.monto, 0)), parcial: m === mesHoy };
    }),
    total: Math.round(pagos.filter(p => p.fecha.startsWith(a) && enMesesSel(p.mes)).reduce((s, p) => s + p.monto, 0)),
  }));

  // ── Comparativo año contra año (acumulado por mes) ──
  const anioHoy = hoy.slice(0, 4);
  const comparativo = (filtros.anios.length ? anios : anios.slice(-3)).map(a => {
    let acc = 0;
    return {
      anio: a,
      puntos: Array.from({ length: 12 }, (_, i) => {
        const m = `${a}-${String(i + 1).padStart(2, '0')}`;
        if (m > corte && a === anioHoy) return null; // solo meses cerrados del año en curso
        if (m > mesHoy) return null;
        if (!enMesesSel(m)) return null; // con filtro de meses, solo los meses elegidos
        acc += enMes(m).reduce((s, p) => s + p.monto, 0);
        return Math.round(acc);
      }),
    };
  });

  return {
    hoy, corte, mesHoy,
    resumen: {
      ultimoMes: { mes: corte, ...rCorte, vsMesPrevio: variacion(rCorte.ingresos, rMesPrevio.ingresos), vsAnioAnterior: variacion(rCorte.ingresos, rMismoMesAnioAnt.ingresos), mesPrevio: rMesPrevio.ingresos, mismoMesAnioAnt: rMismoMesAnioAnt.ingresos },
      enCurso: { mes: mesHoy, dia, diasMes: diasDelMes(mesHoy), ...enCurso, proyeccion, mismaAlturaMesAnterior: mismaAltura, vsMismaAltura: variacion(enCurso.ingresos, mismaAltura), vsMesAnterior: variacion(proyeccion, rCorte.ingresos) },
      doceMeses: { desde: desde12, hasta: corte, ...r12, anterior: rAnt12, vsAnterior: variacion(r12.ingresos, rAnt12.ingresos), ticketVsAnterior: variacion(r12.ticket, rAnt12.ticket), promedioMensual: Math.round(r12.ingresos / 12) },
      porTipo: porTipo12,
      activaciones: { actuales: porTipo12.activacion.ventas, anteriores: activacionesAnt12, vsAnterior: variacion(porTipo12.activacion.ventas, activacionesAnt12) },
      clientes: { pagaron: clientes12, anteriores: clientesAnt12, vsAnterior: variacion(clientes12, clientesAnt12), recurrentes: recurrentes12, pctRecurrentes: pct(recurrentes12, clientes12) },
    },
    sparkline,
    serie,
    distribucion: { ultimos12: distribuciones(ult12), seleccion: distribuciones(seleccion) },
    seleccion: (() => {
      const r = resumenDe(seleccion);
      const nMeses = new Set(seleccion.map(p => p.mes)).size;
      return { ...r, clientes: new Set(seleccion.map(p => p.cliente).filter(Boolean)).size, meses: nMeses, promedioMensual: nMeses ? Math.round(r.ingresos / nMeses) : 0, porTipo: Object.fromEntries(['renovacion', 'activacion', 'otros'].map(t => [t, Math.round(seleccion.filter(p => p.tipo === t).reduce((s, p) => s + p.monto, 0))])) };
    })(),
    filtros,
    opciones,
    estacionalidad,
    comparativo,
  };
}

async function analisisPagos({ hoy, filtros } = {}) {
  const f = normalizarFiltros(filtros);
  return enCache(`pagos-analisis-${hoy || 'hoy'}-${JSON.stringify(f)}`, async () => {
    const ventas = await Venta.findAll({
      attributes: ['fecha', 'precioVenta', 'tipoPago', 'tipoPlan', 'medioPago', 'customerId', 'nickname', 'nombre', 'apellido'],
      raw: true,
    });
    return calcularAnalisisPagos(ventas, { hoy, filtros: f });
  });
}

module.exports = { analisisPagos, calcularAnalisisPagos, normalizarFiltros, medioNormal, familiaPlan };
