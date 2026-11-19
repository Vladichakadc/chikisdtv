// Segmentos de valor del cliente (LTV) para "Análisis Financiero".
//
// Los clientes se ordenan por lo que han pagado en total (LTV) y se parten en
// cinco grupos del mismo tamaño (quintiles, 20% de los clientes cada uno). Lo
// que cambia entre grupos NO es la cantidad de clientes —siempre es la misma—
// sino cuánto del ingreso aporta cada uno, cuánto tiempo llevan y si siguen
// con servicio hoy. Eso es lo que se mide aquí.
//
// Estado de servicio de cada cliente (según el Planificador, misma regla que
// el resto del sistema — utils/planificadorAlerta.varianteDe):
//   · con servicio → tiene alguna pantalla vigente, por vencer o de cortesía
//   · vencido      → sus pantallas están vencidas (todavía se puede renovar)
//   · sin pantalla → ya no tiene pantallas asignadas
const { varianteDe } = require('../utils/planificadorAlerta');

const SEGMENTOS = [
  { clave: 'top', nombre: 'Top', descripcion: 'El 20% que más ha pagado' },
  { clave: 'alto', nombre: 'Alto', descripcion: 'Del 60% al 80%' },
  { clave: 'medio', nombre: 'Medio', descripcion: 'Del 40% al 60%' },
  { clave: 'bajo', nombre: 'Bajo', descripcion: 'Del 20% al 40%' },
  { clave: 'base', nombre: 'Base', descripcion: 'El 20% que menos ha pagado' },
];

function estadoPorCliente(pantallas = []) {
  const estado = new Map(); // customerId → { conServicio, vencido, nombre, nickname }
  for (const p of pantallas) {
    const id = String(p.customerId || '').trim();
    if (!id) continue;
    const v = varianteDe(p);
    if (v === 'libre') continue;
    const e = estado.get(id) || { conServicio: false, vencido: false, nombre: null, nickname: null };
    if (v === 'vencido') e.vencido = true; else e.conServicio = true;
    e.nombre = e.nombre || [p.nombre, p.apellido].filter(Boolean).join(' ').trim() || null;
    e.nickname = e.nickname || p.nickname || null;
    estado.set(id, e);
  }
  return estado;
}

// ltvRows: [{ cid, ingresos, meses }] · pantallas: filas del Planificador
function segmentosLtv(ltvRows = [], pantallas = []) {
  const filas = ltvRows.filter(r => r.ingresos > 0).sort((a, b) => b.ingresos - a.ingresos);
  const n = filas.length;
  const total = filas.reduce((s, r) => s + r.ingresos, 0);
  if (!n) return { totalClientes: 0, totalIngresos: 0, segmentos: [], concentracion: null, curva: [] };
  const estado = estadoPorCliente(pantallas);

  const segmentos = SEGMENTOS.map((seg, i) => {
    const desde = Math.round((n * i) / 5), hasta = Math.round((n * (i + 1)) / 5);
    const grupo = filas.slice(desde, hasta);
    const ingresos = grupo.reduce((s, r) => s + r.ingresos, 0);
    let conServicio = 0, vencidos = 0;
    const vencidosLista = [];
    for (const r of grupo) {
      const e = estado.get(String(r.cid));
      if (e?.conServicio) conServicio += 1;
      else if (e?.vencido) {
        vencidos += 1;
        vencidosLista.push({ customerId: r.cid, nombre: e.nombre || e.nickname || r.cid, nickname: e.nickname, ltv: Math.round(r.ingresos) });
      }
    }
    const sinPantalla = grupo.length - conServicio - vencidos;
    return {
      ...seg,
      clientes: grupo.length,
      ltvMin: grupo.length ? Math.round(grupo[grupo.length - 1].ingresos) : 0,
      ltvMax: grupo.length ? Math.round(grupo[0].ingresos) : 0,
      ltvPromedio: grupo.length ? Math.round(ingresos / grupo.length) : 0,
      ingresos: Math.round(ingresos),
      pctIngreso: total > 0 ? Math.round((ingresos / total) * 1000) / 10 : 0,
      vidaPromedioMeses: grupo.length ? Math.round((grupo.reduce((s, r) => s + (r.meses || 0), 0) / grupo.length) * 10) / 10 : 0,
      conServicio, vencidos, sinPantalla,
      pctConServicio: grupo.length ? Math.round((conServicio / grupo.length) * 100) : 0,
      // Los de mayor valor primero: a quién llamar antes
      vencidosLista: vencidosLista.slice(0, 8),
    };
  });

  // Curva de concentración: % de clientes (de mayor a menor) vs % del ingreso acumulado
  const curva = [{ pctClientes: 0, pctIngreso: 0 }];
  let acumulado = 0;
  for (let i = 0; i < n; i++) {
    acumulado += filas[i].ingresos;
    const pctClientes = Math.round(((i + 1) / n) * 100);
    if (pctClientes !== curva[curva.length - 1].pctClientes) {
      curva.push({ pctClientes, pctIngreso: Math.round((acumulado / total) * 1000) / 10 });
    } else {
      curva[curva.length - 1].pctIngreso = Math.round((acumulado / total) * 1000) / 10;
    }
  }
  // Cuántos clientes (de mayor a menor) suman la mitad del ingreso
  let suma = 0, mitad = 0;
  for (const r of filas) { suma += r.ingresos; mitad += 1; if (suma >= total / 2) break; }

  return {
    totalClientes: n,
    totalIngresos: Math.round(total),
    segmentos,
    concentracion: {
      pctIngresoTop: segmentos[0].pctIngreso,
      clientesMitadIngreso: mitad,
      pctClientesMitadIngreso: Math.round((mitad / n) * 1000) / 10,
      vecesTopVsBase: segmentos[4].ltvPromedio > 0 ? Math.round((segmentos[0].ltvPromedio / segmentos[4].ltvPromedio) * 10) / 10 : null,
    },
    curva,
  };
}

module.exports = { segmentosLtv, SEGMENTOS };
