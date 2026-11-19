// Indicadores operativos del Dashboard — una sola definición para todo el
// tablero (tarjetas, centro de alertas y paneles de vencidas / por vencer):
//
//   · Libre      → pantalla sin cliente (nickname "libre" o sin nombre/nickname)
//   · Vencida    → días al fin de plan ≤ 0 (vence hoy cuenta como vencida)
//   · Por vencer → 1..DIAS_ALERTA días (excluye cortesías)
//   · Cortesía   → pantalla de cortesía vigente
// Es la misma regla de la UI del Planificador (utils/planificadorAlerta.varianteDe).
//
// Cada indicador se informa en PANTALLAS y en CLIENTES (un cliente con varias
// pantallas vencidas cuenta una vez), y la deuda se separa en COP y USD.
const { Planificador, InventarioEquipo, VentaEquipo } = require('../models');
const { DIAS_ALERTA, calcDias, estadoFromDias, varianteDe } = require('../utils/planificadorAlerta');

const ATR = [
  'idPantalla', 'cuentaId', 'cuenta', 'nombre', 'apellido', 'customerId', 'nickname', 'pantallas',
  'duracionReal', 'finalizacion', 'tipoPlan', 'cortesia', 'alertaReal', 'debe', 'montoDebe', 'montoDebeUSD',
];

const claveCliente = (p) => {
  const id = String(p.customerId || '').trim();
  if (id) return `c:${id}`;
  const nick = String(p.nickname || '').trim().toLowerCase();
  return nick ? `n:${nick}` : `p:${p.idPantalla}`;
};

// Campos que necesitan los paneles (CategoryPanel) — sin datos de acceso
function filaPanel(p, dias) {
  const estado = estadoFromDias(dias);
  return {
    idPantalla: p.idPantalla, cuentaId: p.cuentaId, cuenta: p.cuenta,
    nombre: p.nombre, apellido: p.apellido, customerId: p.customerId, nickname: p.nickname,
    pantallas: p.pantallas, duracionReal: p.duracionReal, finalizacion: p.finalizacion,
    tipoPlan: p.tipoPlan, cortesia: !!p.cortesia, debe: !!p.debe,
    montoDebe: p.montoDebe, montoDebeUSD: p.montoDebeUSD,
    estado, estadoReal: estado, diasRestantes: dias,
  };
}

async function inventarioEquipos() {
  const items = await InventarioEquipo.findAll({
    attributes: ['idInventario', 'serie', 'cantidad', 'estado'],
    include: [{ model: VentaEquipo, as: 'venta', attributes: ['idVM'], required: false }],
  });
  let total = 0, disponibles = 0;
  for (const i of items) {
    const unidades = i.serie ? 1 : Math.max(1, Number(i.cantidad) || 1);
    total += unidades;
    if (i.serie && !i.venta && String(i.estado || '').toLowerCase() !== 'vendido') disponibles += 1;
  }
  return { total, disponibles, vendidos: total - disponibles };
}

async function indicadoresOperacion({ diasAlerta = DIAS_ALERTA } = {}) {
  const [filas, equipos] = await Promise.all([
    Planificador.findAll({ attributes: ATR, raw: true }),
    inventarioEquipos(),
  ]);

  const vencidas = [], porVencer = [];
  const clientesVencidos = new Set(), clientesPorVencer = new Set(), clientesActivos = new Set(), clientesDeuda = new Set();
  let pantallas = 0, ocupadas = 0, libres = 0, cortesias = 0, venceHoy = 0, deudaCOP = 0, deudaUSD = 0;

  for (const p of filas) {
    const n = Number(p.pantallas) || 0;
    pantallas += n;
    const variante = varianteDe(p, diasAlerta);
    if (variante === 'libre') { libres += n; continue; }
    ocupadas += n;
    const cliente = claveCliente(p);
    clientesActivos.add(cliente);
    const dias = calcDias(p.duracionReal || p.finalizacion);
    if (variante === 'vencido') {
      vencidas.push(filaPanel(p, dias)); clientesVencidos.add(cliente);
      if (dias === 0) venceHoy += 1;
    } else if (variante === 'alerta') {
      porVencer.push(filaPanel(p, dias)); clientesPorVencer.add(cliente);
    } else if (variante === 'cortesia') {
      cortesias += 1;
    }
    if (p.debe) {
      clientesDeuda.add(cliente);
      deudaCOP += Number(p.montoDebe) || 0;
      deudaUSD += Number(p.montoDebeUSD) || 0;
    }
  }
  // Un cliente con una pantalla vencida y otra por vencer se cuenta como vencido
  for (const c of clientesVencidos) clientesPorVencer.delete(c);

  const porDias = (a, b) => (a.diasRestantes ?? Infinity) - (b.diasRestantes ?? Infinity);
  vencidas.sort(porDias); porVencer.sort(porDias);
  return {
    diasAlerta,
    pantallas: { total: pantallas, ocupadas, libres, cortesias },
    // Capacidad instalada = pantallas configuradas en las cuentas padre
    capacidad: { total: pantallas, ocupadas, libres, pctOcupacion: pantallas > 0 ? Math.round((ocupadas / pantallas) * 100) : 0 },
    clientes: { activos: clientesActivos.size },
    vencidas: { pantallas: vencidas.length, clientes: clientesVencidos.size, venceHoy },
    porVencer: { pantallas: porVencer.length, clientes: clientesPorVencer.size },
    deuda: { clientes: clientesDeuda.size, cop: Math.round(deudaCOP), usd: Math.round(deudaUSD * 100) / 100 },
    equipos,
    listas: { vencidas, porVencer },
  };
}

module.exports = { indicadoresOperacion, claveCliente };
