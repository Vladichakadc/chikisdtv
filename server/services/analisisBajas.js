// Análisis de Bajas: ¿por qué se van los clientes, cuándo, cuánto cuesta y
// cuántos vuelven?
//
// Reglas:
//   · Motivo        → categoría del catálogo (utils/motivosBaja.js); las bajas
//                     sin motivo se cuentan aparte, nunca se reparten.
//   · Ingreso perdido → valor mensual de la última venta del cliente antes de
//                     la baja (precio ÷ meses del plan). Estimado por baja.
//   · Vida          → meses entre la primera "Activacion Pantalla" del cliente
//                     y la fecha de baja.
//   · Recuperado    → el cliente volvió a comprar (venta no cortesía) después
//                     de la fecha de baja.
//   · "Cambio de cuenta o de pantalla" es un movimiento interno: se muestra,
//     pero no cuenta como cliente perdido en los indicadores.
const { Baja, Venta } = require('../models');
const { MOTIVOS_BAJA, SIN_MOTIVO, categoriaMotivo } = require('../utils/motivosBaja');
const { mesesDePlan } = require('./retencion');

const ym = (f) => String(f || '').slice(0, 7);
const mesesEntre = (a, b) => {
  const [ya, ma, da] = String(a).slice(0, 10).split('-').map(Number);
  const [yb, mb, db] = String(b).slice(0, 10).split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma) + (db - da) / 30;
};
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const hoyISO = () => new Date().toLocaleDateString('en-CA');
function sumarMeses(mes, n) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const TRAMOS_VIDA = [
  { tramo: 'Menos de 1 mes', hasta: 1 },
  { tramo: '1 a 3 meses', hasta: 3 },
  { tramo: '3 a 6 meses', hasta: 6 },
  { tramo: '6 a 12 meses', hasta: 12 },
  { tramo: '1 a 2 años', hasta: 24 },
  { tramo: 'Más de 2 años', hasta: Infinity },
];

// Una fila por baja con su categoría de motivo, la última venta antes de la
// baja, la permanencia y si el cliente volvió. Base del análisis y del plan
// de retención (services/retencionBajas.js).
function filasDeBajas(bajas, ventas) {
  // Ventas por cliente, ordenadas
  const porCliente = new Map();
  for (const v of ventas) {
    if (!v.customerId || !v.fecha) continue;
    const id = String(v.customerId).trim();
    if (!porCliente.has(id)) porCliente.set(id, []);
    porCliente.get(id).push(v);
  }
  for (const l of porCliente.values()) l.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

  return bajas.filter(b => b.fechaBaja).map(b => {
    const cat = categoriaMotivo(b.motivo);
    const id = String(b.customerId || '').trim();
    const vs = porCliente.get(id) || [];
    const antes = vs.filter(v => v.fecha <= b.fechaBaja && v.tipoPago !== 'Cortesia');
    const ultima = antes[antes.length - 1];
    const activacion = vs.find(v => v.tipoPago === 'Activacion Pantalla');
    const vuelve = vs.find(v => v.fecha > b.fechaBaja && v.tipoPago !== 'Cortesia');
    const vida = activacion && activacion.fecha <= b.fechaBaja ? Math.max(0, mesesEntre(activacion.fecha, b.fechaBaja)) : null;
    return {
      id: b.id, idBaja: b.idBaja, nickname: b.nickname, nombre: [b.nombre, b.apellido].filter(Boolean).join(' ').trim() || null,
      customerId: id || null, fechaBaja: String(b.fechaBaja).slice(0, 10), mes: ym(b.fechaBaja),
      pantallas: Number(b.pantallas) || 1, tipoPlan: b.tipoPlan || 'Sin plan', motivoTexto: b.motivo || null,
      observaciones: b.observaciones || null, devolucion: String(b.devolucion || '').trim().toUpperCase() === 'SI',
      categoria: cat.clave, categoriaNombre: cat.nombre,
      ingresoMensual: ultima ? Math.round((Number(ultima.precioVenta) || 0) / mesesDePlan(ultima.tipoPlan)) : 0,
      vidaMeses: vida == null ? null : Math.round(vida * 10) / 10,
      recuperado: !!vuelve,
      fechaRegreso: vuelve ? String(vuelve.fecha).slice(0, 10) : null,
      ultimaVenta: ultima ? { tipoPlan: ultima.tipoPlan || null, precioVenta: Number(ultima.precioVenta) || 0, fecha: String(ultima.fecha).slice(0, 10) } : null,
    };
  });
}

function calcularAnalisisBajas(bajas, ventas, { hoy = hoyISO() } = {}) {
  const filas = filasDeBajas(bajas, ventas);

  const reales = filas.filter(f => f.categoria !== 'cambio_cuenta');
  const desde12 = sumarMeses(ym(hoy), -12); // últimos 12 meses (incluye el mes en curso)
  const desde24 = sumarMeses(ym(hoy), -24);
  const ult12 = reales.filter(f => f.mes > desde12);
  const ant12 = reales.filter(f => f.mes > desde24 && f.mes <= desde12);

  // Por motivo (todas las bajas reales del período elegido en el cliente: se
  // entregan histórico y últimos 12 meses)
  const agrupar = (lista) => {
    const total = lista.length;
    const conMotivo = lista.filter(f => f.categoria !== 'sin_motivo').length;
    const cats = [...MOTIVOS_BAJA, SIN_MOTIVO].map(m => {
      const g = lista.filter(f => f.categoria === m.clave);
      return {
        clave: m.clave, nombre: m.nombre, bajas: g.length,
        // % sobre las bajas CON motivo (las sin motivo no reparten su peso)
        pctConMotivo: m.clave === 'sin_motivo' ? null : pct(g.length, conMotivo),
        pctTotal: pct(g.length, total),
        pantallas: g.reduce((s, f) => s + f.pantallas, 0),
        ingresoMensual: g.reduce((s, f) => s + f.ingresoMensual, 0),
        recuperados: g.filter(f => f.recuperado).length,
        pctRecuperados: pct(g.filter(f => f.recuperado).length, g.length),
        vidaPromedio: (() => { const v = g.filter(f => f.vidaMeses != null); return v.length ? Math.round((v.reduce((s, f) => s + f.vidaMeses, 0) / v.length) * 10) / 10 : null; })(),
      };
    }).filter(c => c.bajas > 0).sort((a, b) => (a.clave === 'sin_motivo') - (b.clave === 'sin_motivo') || b.bajas - a.bajas);
    return { total, conMotivo, pctConMotivo: pct(conMotivo, total), categorias: cats };
  };

  // Bajas por mes (24 meses) con motivo apilado (top 4 categorías + otros + sin motivo)
  const top = agrupar(reales).categorias.filter(c => c.clave !== 'sin_motivo').slice(0, 4).map(c => c.clave);
  const porMes = [];
  for (let i = 23; i >= 0; i--) {
    const mes = sumarMeses(ym(hoy), -i);
    const g = reales.filter(f => f.mes === mes);
    const fila = { mes, bajas: g.length, ingresoPerdido: g.reduce((s, f) => s + f.ingresoMensual, 0) };
    for (const k of top) fila[k] = g.filter(f => f.categoria === k).length;
    fila.otros = g.filter(f => !top.includes(f.categoria) && f.categoria !== 'sin_motivo').length;
    fila.sin_motivo = g.filter(f => f.categoria === 'sin_motivo').length;
    porMes.push(fila);
  }

  // Vida antes de la baja
  const conVida = reales.filter(f => f.vidaMeses != null);
  const vida = TRAMOS_VIDA.map((t, i) => {
    const desde = i === 0 ? -1 : TRAMOS_VIDA[i - 1].hasta;
    const g = conVida.filter(f => f.vidaMeses > desde && f.vidaMeses <= t.hasta);
    return { tramo: t.tramo, bajas: g.length, pct: pct(g.length, conVida.length) };
  });

  // Motivo según plan (solo bajas con motivo)
  const planes = [...new Set(reales.map(f => f.tipoPlan))].filter(p => p !== 'Sin plan').sort();
  const porPlan = planes.map(plan => {
    const g = reales.filter(f => f.tipoPlan === plan);
    const cm = g.filter(f => f.categoria !== 'sin_motivo');
    const fila = { plan, bajas: g.length, conMotivo: cm.length };
    for (const m of MOTIVOS_BAJA) fila[m.clave] = cm.filter(f => f.categoria === m.clave).length;
    return fila;
  });

  const suma = (l, k) => l.reduce((s, f) => s + f[k], 0);
  const vidaProm = (l) => { const v = l.filter(f => f.vidaMeses != null); return v.length ? Math.round((v.reduce((s, f) => s + f.vidaMeses, 0) / v.length) * 10) / 10 : null; };

  return {
    hoy,
    catalogo: MOTIVOS_BAJA.map(({ clave, nombre }) => ({ clave, nombre })),
    resumen: {
      bajas12: ult12.length, bajasAnt12: ant12.length,
      pantallas12: suma(ult12, 'pantallas'),
      ingresoPerdido12: suma(ult12, 'ingresoMensual'),
      vidaPromedio12: vidaProm(ult12),
      recuperados12: ult12.filter(f => f.recuperado).length,
      pctRecuperados12: pct(ult12.filter(f => f.recuperado).length, ult12.length),
      devoluciones12: ult12.filter(f => f.devolucion).length,
      movimientosInternos: filas.length - reales.length,
      totalHistorico: reales.length,
    },
    motivos: { ultimos12: agrupar(ult12), historico: agrupar(reales) },
    topMotivos: top,
    porMes,
    vida,
    porPlan,
    // Para clasificar: las más recientes primero
    sinMotivo: filas.filter(f => f.categoria === 'sin_motivo').sort((a, b) => b.fechaBaja.localeCompare(a.fechaBaja))
      .map(({ id, idBaja, nickname, nombre, fechaBaja, tipoPlan, observaciones, recuperado }) => ({ id, idBaja, nickname, nombre, fechaBaja, tipoPlan, observaciones, recuperado })),
  };
}

async function analisisBajas(opciones) {
  const [bajas, ventas] = await Promise.all([
    Baja.findAll({ raw: true }),
    Venta.findAll({ attributes: ['customerId', 'fecha', 'tipoPago', 'tipoPlan', 'precioVenta'], raw: true }),
  ]);
  return calcularAnalisisBajas(bajas, ventas, opciones);
}

module.exports = { analisisBajas, calcularAnalisisBajas, filasDeBajas };
