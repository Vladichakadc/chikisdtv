/**
 * generar_informe_planificador.js
 * Genera Informe_Planificador_Mejoras.pdf documentando las 7 mejoras implementadas.
 * Uso: node generar_informe_planificador.js
 */

const PDFDocument = require('pdfkit');
const fs          = require('fs');
const path        = require('path');

// Carga las variables de entorno desde server/.env antes de requerir modelos
// dotenv vive en server/node_modules (no en la raíz)
try {
  require('./server/node_modules/dotenv').config({ path: path.join(__dirname, 'server', '.env') });
} catch (_) {
  // Si dotenv no está disponible, leer el .env manualmente
  try {
    const envContent = fs.readFileSync(path.join(__dirname, 'server', '.env'), 'utf8');
    envContent.split('\n').forEach(line => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    });
  } catch (_e) {}
}

const sequelize = require('./server/config/database');
const { Planificador, CuentaPadre } = require('./server/models');

const OUTPUT = path.join(__dirname, 'Informe_Planificador_Mejoras.pdf');

// ─── Paleta de colores ────────────────────────────────────────────────────────
const ORANGE   = '#f97316';
const DARK     = '#1e293b';
const GRAY     = '#64748b';
const BORDER   = '#e2e8f0';
const RED      = '#dc2626';
const AMBER    = '#d97706';
const GREEN    = '#15803d';
const BLUE     = '#1d4ed8';

const doc = new PDFDocument({
  size: 'A4', margin: 50, bufferPages: true,
  info: { Title: 'Informe de Mejoras del Planificador — ChikisdTV', Author: 'Claude Code' },
});
doc.pipe(fs.createWriteStream(OUTPUT));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hr(color = BORDER) {
  doc.moveDown(0.3);
  doc.strokeColor(color).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);
}

function h1(text) {
  if (doc.y > 700) doc.addPage();
  doc.fillColor(ORANGE).font('Helvetica-Bold').fontSize(18).text(text);
  hr();
}

function h2(text) {
  if (doc.y > 720) doc.addPage();
  doc.moveDown(0.5);
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(13).text(text);
  doc.moveDown(0.3);
}

function h3(text, color = ORANGE) {
  if (doc.y > 740) doc.addPage();
  doc.moveDown(0.3);
  doc.fillColor(color).font('Helvetica-Bold').fontSize(11).text(text);
  doc.moveDown(0.2);
}

function p(text, opts = {}) {
  if (doc.y > 760) doc.addPage();
  doc.fillColor(opts.color || DARK).font('Helvetica').fontSize(10)
    .text(text, { align: 'justify', lineGap: 2, ...opts });
  doc.moveDown(0.3);
}

function bullet(text, color = DARK) {
  if (doc.y > 760) doc.addPage();
  doc.fillColor(color).font('Helvetica').fontSize(10)
    .text('  • ' + text, { indent: 10, lineGap: 2 });
}

function tag(text, color = ORANGE) {
  const w  = doc.widthOfString(text) + 12;
  const h  = 14;
  const x  = 50;
  const y  = doc.y;
  doc.roundedRect(x, y, w, h, 3).fill(color + '22');
  doc.fillColor(color).font('Helvetica-Bold').fontSize(8.5).text(text, x + 6, y + 2.5, { lineBreak: false });
  doc.moveDown(0.6);
}

function kpiRow(items) {
  const colW = 495 / items.length;
  const startX = 50;
  const startY = doc.y;
  const boxH   = 44;
  items.forEach(({ label, value, color }, i) => {
    const x = startX + i * colW;
    doc.roundedRect(x, startY, colW - 4, boxH, 4).fill(BORDER + '55');
    doc.fillColor(color || ORANGE).font('Helvetica-Bold').fontSize(15).text(String(value), x + 6, startY + 6, { width: colW - 12, align: 'center' });
    doc.fillColor(GRAY).font('Helvetica').fontSize(8.5).text(label, x + 6, startY + 27, { width: colW - 12, align: 'center' });
  });
  doc.y = startY + boxH + 8;
  doc.moveDown(0.3);
}

function tableRow(cells, widths, isHeader = false) {
  const startX = 50;
  const startY = doc.y;
  const rowH   = isHeader ? 18 : 15;
  cells.forEach((cell, i) => {
    const x = startX + widths.slice(0, i).reduce((a, b) => a + b, 0);
    if (isHeader) doc.rect(x, startY, widths[i], rowH).fill('#1e293b');
    doc.fillColor(isHeader ? '#ffffff' : DARK)
      .font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
      .text(String(cell ?? ''), x + 4, startY + (isHeader ? 4 : 3), { width: widths[i] - 8, lineBreak: false });
  });
  if (!isHeader) {
    doc.strokeColor(BORDER).lineWidth(0.5)
      .moveTo(startX, startY + rowH).lineTo(545, startY + rowH).stroke();
  }
  doc.y = startY + rowH;
}

function calcDias(fecha) {
  if (!fecha) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(fecha); if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function fmtDate(d) {
  if (!d) return '—';
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(d);
}

const DIAS_ALERTA    = 8;
const DIAS_ALERTA_CP = 30;

function getVariantPantalla(p) {
  const nick   = (p.nickname || '').trim().toLowerCase();
  const nombre = (String(p.nombre ?? '') + String(p.apellido ?? '')).trim();
  if (nick.includes('libre') || (!nombre && !nick)) return 'libre';
  const dias = p.duracionReal != null ? calcDias(p.duracionReal) : calcDias(p.finalizacion);
  if (dias != null && dias <= 0) return 'vencido';
  if ((p.alertaReal || '').trim().toUpperCase() === 'CORTESIA') return 'cortesia';
  if (dias != null && dias <= DIAS_ALERTA) return 'alerta';
  return 'vigente';
}

function getCPVariante(dias) {
  if (dias == null) return 'sin_fecha';
  if (dias <= 0) return 'vencida';
  if (dias <= DIAS_ALERTA_CP) return 'alerta';
  return 'vigente';
}

// ─── Datos en vivo de la BD ───────────────────────────────────────────────────

async function fetchData() {
  await sequelize.authenticate();
  const planRows = await Planificador.findAll({ raw: true });
  const cpRows   = await CuentaPadre.findAll({ raw: true });

  const variantes = planRows.map(getVariantPantalla);
  const total     = planRows.length;
  const libres    = variantes.filter(v => v === 'libre').length;
  const vencidas  = variantes.filter(v => v === 'vencido').length;
  const alerta    = variantes.filter(v => v === 'alerta').length;
  const cortesias = variantes.filter(v => v === 'cortesia').length;
  const debe      = planRows.filter(p => p.debe).length;
  const cuentas   = new Set(planRows.map(p => p.cuentaId)).size;
  const ocupadas  = total - libres;
  const pctOcup   = total ? Math.round((ocupadas / total) * 100) : 0;

  const cpMap = {};
  cpRows.forEach(cp => { cpMap[cp.cuentaId] = cp; });

  const cpVencidas    = cpRows.filter(cp => getCPVariante(calcDias(cp.fechaFin)) === 'vencida');
  const cpEnAlerta    = cpRows.filter(cp => getCPVariante(calcDias(cp.fechaFin)) === 'alerta');
  const cpVigentes    = cpRows.filter(cp => getCPVariante(calcDias(cp.fechaFin)) === 'vigente');

  // Capacidad por cuenta
  const byAccount = {};
  planRows.forEach(p => {
    if (!byAccount[p.cuentaId]) byAccount[p.cuentaId] = [];
    byAccount[p.cuentaId].push(p);
  });
  const capacidadPorCuenta = Object.entries(byAccount).map(([cid, rows]) => {
    const cp  = cpMap[cid];
    const cap = rows.reduce((s, p) => s + (Number(p.pantallas) || 1), 0);
    const lib = rows.filter(p => getVariantPantalla(p) === 'libre').reduce((s, p) => s + (Number(p.pantallas) || 1), 0);
    const ocp = cap - lib;
    const dias = cp ? calcDias(cp.fechaFin) : null;
    return {
      cuentaId: cid,
      nombre: cp?.nombreUsuario || '—',
      capacidad: cap,
      ocupadas: ocp,
      libres: lib,
      pctOcupacion: cap ? Math.round((ocp / cap) * 100) : 0,
      diasAlFin: dias,
      varianteCp: getCPVariante(dias),
    };
  }).sort((a, b) => a.cuentaId.localeCompare(b.cuentaId));

  // syncPendiente
  const SYNC_FIELDS = ['cuenta', 'password', 'credito', 'inicio', 'finalizacion'];
  const planMap = {};
  planRows.forEach(r => { if (!planMap[r.cuentaId]) planMap[r.cuentaId] = r; });
  const conDivergencia = cpRows.filter(cp => {
    const plan = planMap[String(cp.cuentaId).trim()];
    if (!plan) return false;
    const nv = { cuenta: cp.nombreUsuario || null, password: cp.contrasena || null, credito: cp.credito ?? null, inicio: cp.fechaInicio || null, finalizacion: cp.fechaFin || null };
    return SYNC_FIELDS.some(f => {
      const a = nv[f] ?? null; const b = plan[f] ?? null;
      if (a === null && b === null) return false;
      if (a === null || b === null) return true;
      return f === 'credito' ? Number(a) !== Number(b) : String(a).trim() !== String(b).trim();
    });
  });

  return {
    total, libres, vencidas, alerta, cortesias, debe, cuentas, ocupadas, pctOcup,
    cpVencidas, cpEnAlerta, cpVigentes, cpRows,
    capacidadPorCuenta,
    conDivergencia,
    fechaCorte: new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }),
  };
}

// ─── Generación del PDF ───────────────────────────────────────────────────────

async function main() {
  const d = await fetchData();

  // ── PORTADA ──────────────────────────────────────────────────────────────
  doc.rect(0, 0, 595, 200).fill(DARK);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(28)
    .text('Planificador', 50, 60);
  doc.fillColor(ORANGE).fontSize(22).text('Informe de Mejoras Implementadas', 50, 96);
  doc.fillColor('#94a3b8').font('Helvetica').fontSize(11)
    .text(`ChikisdTV · ${d.fechaCorte}`, 50, 132);
  doc.fillColor('#64748b').fontSize(9)
    .text('Control de cuentas padre · Alertas proactivas · Capacidad por cuenta · Sincronización inteligente', 50, 155);

  doc.y = 220;

  // ── RESUMEN EJECUTIVO ─────────────────────────────────────────────────────
  h1('Resumen Ejecutivo');
  p(`Este informe documenta las 7 mejoras implementadas al módulo Planificador de ChikisdTV, ` +
    `orientadas a mejorar la visibilidad operativa, la gestión proactiva de vencimientos y la ` +
    `eficiencia en la asignación de pantallas. Los datos reflejan el estado actual de la base de datos ` +
    `al momento de generar este informe (${d.fechaCorte}).`);

  kpiRow([
    { label: 'Pantallas totales', value: d.total },
    { label: 'Pantallas libres',  value: d.libres, color: GREEN },
    { label: 'Vencidas',          value: d.vencidas, color: RED },
    { label: 'Cuentas padre',     value: d.cpRows.length },
    { label: 'CP vencidas',       value: d.cpVencidas.length, color: RED },
  ]);

  h2('Estado actual del negocio');
  bullet(`${d.cuentas} cuentas padre con pantallas activas en el Planificador`);
  bullet(`Ocupación global: ${d.pctOcup}% (${d.ocupadas} asignadas de ${d.total} pantallas)`);
  bullet(`${d.vencidas} pantalla${d.vencidas !== 1 ? 's' : ''} con cliente vencido — requieren renovación inmediata`);
  bullet(`${d.alerta} pantalla${d.alerta !== 1 ? 's' : ''} próximas a vencer (≤ ${DIAS_ALERTA} días)`);
  bullet(`${d.debe} cuenta${d.debe !== 1 ? 's' : ''} con mora registrada`);
  bullet(`${d.cpVencidas.length} cuenta${d.cpVencidas.length !== 1 ? 's' : ''} padre vencida${d.cpVencidas.length !== 1 ? 's' : ''} — afectan todas sus pantallas simultáneamente`);
  bullet(`${d.cpEnAlerta.length} cuenta${d.cpEnAlerta.length !== 1 ? 's' : ''} padre próxima${d.cpEnAlerta.length !== 1 ? 's' : ''} a vencer (≤ ${DIAS_ALERTA_CP} días)`);
  if (d.conDivergencia.length > 0) {
    bullet(`${d.conDivergencia.length} cuenta${d.conDivergencia.length !== 1 ? 's' : ''} padre con datos desincronizados del Planificador`, AMBER);
  }
  doc.moveDown(0.5);

  // ── MEJORA A ──────────────────────────────────────────────────────────────
  doc.addPage();
  h1('Mejora A — Monitor en Tiempo Real de Cuentas Padre');
  tag('CRÍTICO · Previene interrupciones masivas de servicio');

  h2('Problema que resuelve');
  p(`Antes de esta mejora, el Planificador solo mostraba alertas de vencimiento de pantallas ` +
    `individuales (cliente a cliente). Sin embargo, cuando una cuenta padre vence, ` +
    `TODAS sus pantallas dejan de funcionar simultáneamente — decenas de clientes afectados ` +
    `de golpe sin ninguna alerta proactiva en el flujo principal.`);

  h2('Solución implementada');
  bullet('2 nuevas StatCards en PlanificadorPage: "CP Vencidas" (rojo) y "CP En Alerta" (ámbar)');
  bullet('Las tarjetas son clickeables y abren el CuentasPadreAlertPanel con detalles de cada cuenta');
  bullet('El panel muestra: ID Cuenta, Usuario IPTV, Fecha de vencimiento, Días restantes');
  bullet('Botón directo "Ver en Cuentas Padre" para navegar y actuar inmediatamente');
  bullet('Las tarjetas solo aparecen cuando hay cuentas en estado crítico (sin ruido visual si todo está vigente)');

  h2('Archivos modificados');
  bullet('server/routes/admin/planificador.js — GET /planificador ahora retorna cuentasPadreStatus[]');
  bullet('client/src/pages/admin/PlanificadorPage.jsx — CuentasPadreAlertPanel + StatCards CP');

  h2('Situación actual');
  if (d.cpVencidas.length > 0) {
    p(`⚠️  ALERTA ACTIVA: ${d.cpVencidas.length} cuenta${d.cpVencidas.length !== 1 ? 's' : ''} padre vencida${d.cpVencidas.length !== 1 ? 's' : ''}:`, { color: RED });
    tableRow(['ID Cuenta', 'Usuario', 'Fecha Fin', 'Días Vencida'], [70, 160, 100, 100], true);
    d.cpVencidas.slice(0, 10).forEach(cp => {
      const dias = calcDias(cp.fechaFin);
      tableRow([cp.cuentaId, cp.nombreUsuario || '—', fmtDate(cp.fechaFin), dias != null ? Math.abs(dias) + 'd' : '—'], [70, 160, 100, 100]);
    });
    doc.moveDown(0.5);
  } else {
    p('✓  No hay cuentas padre vencidas en este momento.', { color: GREEN });
  }
  if (d.cpEnAlerta.length > 0) {
    p(`⚡  ${d.cpEnAlerta.length} cuenta${d.cpEnAlerta.length !== 1 ? 's' : ''} próxima${d.cpEnAlerta.length !== 1 ? 's' : ''} a vencer:`, { color: AMBER });
    tableRow(['ID Cuenta', 'Usuario', 'Fecha Fin', 'Días Restantes'], [70, 160, 100, 100], true);
    d.cpEnAlerta.slice(0, 10).forEach(cp => {
      const dias = calcDias(cp.fechaFin);
      tableRow([cp.cuentaId, cp.nombreUsuario || '—', fmtDate(cp.fechaFin), dias != null ? dias + 'd' : '—'], [70, 160, 100, 100]);
    });
  }

  // ── MEJORA B ──────────────────────────────────────────────────────────────
  doc.addPage();
  h1('Mejora B — Endpoint de Preview de Sincronización');
  tag('INFORMATIVO · Permite revisar cambios antes de aplicarlos');

  h2('Problema que resuelve');
  p(`La sincronización entre Cuentas Padre y el Planificador era irreversible visualmente: ` +
    `el operador no podía saber cuántos campos cambiarían ni en qué cuentas antes de ejecutarla. ` +
    `Solo el resultado post-sync era visible (y la única opción era deshacer).`);

  h2('Solución implementada');
  bullet('Nuevo endpoint GET /api/admin/planificador/sync-preview (sin efectos secundarios)');
  bullet('Retorna el mismo formato diff que el sync real pero sin modificar la BD');
  bullet('Permite construir una vista previa "¿qué cambiaría?" antes de sincronizar');
  bullet('El frontend ya muestra el diff post-sync (SyncDiffModal) — el preview usa el mismo contrato');

  h2('Contrato de respuesta');
  p('GET /api/admin/planificador/sync-preview → { diff[], totalConCambios }');
  p('Cada elemento diff: { cuentaId, cuenta, estado, diasAlFin, status, pantallasAfectadas, cambios[] }');
  p('status puede ser: "actualizada" | "sin_cambio" | "sin_pantallas"');
  p('cambios[]: { campo, antes, despues } — solo campos que cambiarían');

  // ── MEJORA C ──────────────────────────────────────────────────────────────
  doc.addPage();
  h1('Mejora C — Indicador de Sincronización Pendiente');
  tag('UX · Notificación proactiva sin interrumpir el flujo');

  h2('Problema que resuelve');
  p(`Cuando se actualiza una cuenta padre (cambio de contraseña, fechas, crédito), ` +
    `el operador debía recordar manualmente sincronizar el Planificador. ` +
    `No había indicación visual de que los datos estaban desactualizados.`);

  h2('Solución implementada');
  bullet('El GET /planificador calcula syncPendiente comparando CP vs. filas del Planificador');
  bullet('Si hay divergencias, aparece un punto naranja animado (ping) sobre el botón "Sincronizar Cuentas Padre"');
  bullet('La animación es discreta: no interrumpe el trabajo pero es visible cuando el operador mira los controles');
  bullet('El indicador desaparece automáticamente tras ejecutar la sincronización');

  h2('Lógica de detección');
  bullet('Se comparan 5 campos: cuenta (nombreUsuario), password (contrasena), credito, inicio (fechaInicio), finalizacion (fechaFin)');
  bullet('La comparación es case-insensitive y trim para evitar falsos positivos por espacios');
  bullet('Solo activa si hay Planificador rows para esa cuentaId (CP sin pantallas no cuenta)');

  h2('Estado actual');
  if (d.conDivergencia.length > 0) {
    p(`⚠️  ${d.conDivergencia.length} cuenta${d.conDivergencia.length !== 1 ? 's' : ''} con datos desincronizados — el badge estará activo:`, { color: AMBER });
    d.conDivergencia.slice(0, 8).forEach(cp => bullet(`${cp.cuentaId}: ${cp.nombreUsuario || '—'}`));
  } else {
    p('✓  Todos los datos del Planificador están sincronizados con Cuentas Padre.', { color: GREEN });
  }

  // ── MEJORA D ──────────────────────────────────────────────────────────────
  doc.addPage();
  h1('Mejora D — Widget de Capacidad por Cuenta Padre');
  tag('ESTRATÉGICO · Visibilidad de rentabilidad marginal');

  h2('Problema que resuelve');
  p(`Era imposible ver de un vistazo qué cuentas padre tenían pantallas libres disponibles ` +
    `para nuevas ventas vs. cuáles estaban al tope. Esta información es crítica: ` +
    `asignar una pantalla libre tiene costo marginal cero (la cuenta ya está pagada).`);

  h2('Solución implementada');
  bullet('GET /planificador ahora retorna capacidadPorCuenta[] con métricas por cuenta');
  bullet('Widget colapsable en PlanificadorPage: se activa al clic en las tarjetas de "Pantallas libres" u "Ocupación global"');
  bullet('Tabla con: ID Cuenta, Usuario, Capacidad total, Ocupadas, Libres, % Ocupación (barra de progreso), Estado CP');
  bullet('La barra cambia de color: verde (<80%), ámbar (80-95%), rojo (>95%) — igual que en CuentasPadrePage');
  bullet('Filas con fondo rojo/ámbar si la cuenta padre está vencida/en alerta');

  h2('Datos actuales de capacidad');
  if (d.capacidadPorCuenta.length > 0) {
    tableRow(['ID', 'Usuario', 'Cap.', 'Ocup.', 'Libres', '% Ocup.', 'Estado CP'], [45, 140, 40, 45, 50, 55, 70], true);
    d.capacidadPorCuenta.forEach(c => {
      const estadoLabel = c.varianteCp === 'vencida' ? 'VENCIDA'
                        : c.varianteCp === 'alerta'  ? `${c.diasAlFin}d alerta`
                        : c.varianteCp === 'vigente' ? `${c.diasAlFin}d`
                        : 'Sin fecha';
      tableRow([c.cuentaId, (c.nombre || '—').substring(0, 20), c.capacidad, c.ocupadas, c.libres, `${c.pctOcupacion}%`, estadoLabel], [45, 140, 40, 45, 50, 55, 70]);
    });
    doc.moveDown(0.5);
    const totCap = d.capacidadPorCuenta.reduce((s, c) => s + c.capacidad, 0);
    const totLib = d.capacidadPorCuenta.reduce((s, c) => s + c.libres, 0);
    const totOcp = d.capacidadPorCuenta.reduce((s, c) => s + c.ocupadas, 0);
    kpiRow([
      { label: 'Capacidad total', value: totCap },
      { label: 'Ocupadas', value: totOcp },
      { label: 'Libres (ventas posibles)', value: totLib, color: GREEN },
      { label: '% Ocupación global', value: `${totCap ? Math.round((totOcp / totCap) * 100) : 0}%` },
    ]);
  }

  // ── MEJORA E ──────────────────────────────────────────────────────────────
  doc.addPage();
  h1('Mejora E — Gráfico de Ocupación en CuentasPadrePage');
  tag('VISUALIZACIÓN · Análisis de rentabilidad por cuenta');

  h2('Estado');
  p(`Esta mejora ya estaba implementada en CuentasPadrePage.jsx (código existente, líneas 1063-1095). ` +
    `Se documenta aquí por completitud del informe.`);

  h2('Descripción');
  bullet('Gráfico de barras horizontales apiladas (Recharts ComposedChart) visible en /admin/cuentas-padre');
  bullet('Cada barra muestra: pantallas activas (azul) vs. pantallas libres (naranja) por cuenta');
  bullet('Tooltip muestra el ID de cuenta real al pasar el cursor');
  bullet('Narrativa automática en español: "La red de X cuentas padre suma Y pantallas..."');
  bullet('KPIs: Capacidad instalada, Pantallas activas, Pantallas libres, Tasa de ocupación');
  bullet('Cada KPI tiene modal explicativo (KpiExplainModal) con fórmula y fuente de datos');

  h2('Fuente de datos');
  p('Los datos provienen de /api/admin/dashboard-bi (campo ocupacion.detalle). ' +
    'Esta fuente es la misma que usa el Dashboard principal, garantizando consistencia entre módulos.');

  // ── MEJORA F ──────────────────────────────────────────────────────────────
  doc.addPage();
  h1('Mejora F — Navegación Directa a Cuentas Padre');
  tag('UX · Flujo de acción sin fricción');

  h2('Problema que resuelve');
  p(`Al detectar una cuenta padre vencida desde el Planificador, el operador debía navegar ` +
    `manualmente al módulo de Cuentas Padre para actuar. No había un camino directo.`);

  h2('Solución implementada');
  bullet('El CuentasPadreAlertPanel (Mejora A) incluye botón "Ver en Cuentas Padre" en el footer');
  bullet('El botón navega directamente a /admin/cuentas-padre via React Router navigate()');
  bullet('Cuentas Padre ya tiene filtro por variante (Vigentes / Alerta / Vencidas) para localizar la cuenta');
  bullet('Flujo completo: Planificador → detectar CP vencida → clic → CP → filtrar → editar y recargar');

  // ── MEJORA G ──────────────────────────────────────────────────────────────
  doc.addPage();
  h1('Mejora G — Informe PDF de Mejoras (este documento)');
  tag('DOCUMENTACIÓN · Trazabilidad de cambios');

  h2('Descripción');
  p(`Este informe es generado por generar_informe_planificador.js usando pdfkit. ` +
    `Se conecta directamente a la base de datos SQLite de producción para capturar ` +
    `métricas en tiempo real y documentar el estado del sistema junto con los cambios implementados.`);

  h2('Cómo ejecutar');
  bullet('node generar_informe_planificador.js');
  bullet('Requiere que server/.env tenga JWT_SECRET configurado (necesario para cargar modelos Sequelize)');
  bullet('El output es Informe_Planificador_Mejoras.pdf en la raíz del proyecto');
  bullet('Puede ejecutarse en cualquier momento para actualizar las métricas');

  h2('Métricas en tiempo real capturadas');
  bullet('Estado actual de todas las pantallas del Planificador (variante por fila)');
  bullet('Estado de vencimiento de cada cuenta padre (calcDias vs. fechaFin)');
  bullet('Capacidad por cuenta (capacidad total, ocupadas, libres, % ocupación)');
  bullet('Cuentas con datos desincronizados entre Cuentas Padre y Planificador');

  // ── RESUMEN DE ARCHIVOS MODIFICADOS ──────────────────────────────────────
  doc.addPage();
  h1('Resumen de Cambios por Archivo');

  h2('Backend');
  h3('server/routes/admin/planificador.js', BLUE);
  bullet('+ const DIAS_ALERTA_CP = 30');
  bullet('+ function calcCPVariante(dias) — variante vencida/alerta/vigente/sin_fecha');
  bullet('GET /planificador: ahora retorna cuentasPadreStatus[], capacidadPorCuenta[], syncPendiente');
  bullet('+ GET /planificador/sync-preview — diff readonly sin modificar DB');

  h2('Frontend');
  h3('client/src/pages/admin/PlanificadorPage.jsx', BLUE);
  bullet('+ import { Building2, ExternalLink, ChevronDown } from lucide-react');
  bullet('+ const DIAS_ALERTA_CP = 30');
  bullet('+ function CuentasPadreAlertPanel({ cuentas, titulo, variante, onClose, navigate })');
  bullet('+ estado: showCpPanel, cpPanelVariante, showCapacidad');
  bullet('+ useMemo: cpVencidas, cpAlerta, syncPendiente');
  bullet('+ JSX: render CuentasPadreAlertPanel condicional');
  bullet('+ JSX: badge animado (ping) en botón "Sincronizar Cuentas Padre"');
  bullet('+ JSX: grid de 4 StatCards CP (solo visible si hay vencidas/alerta)');
  bullet('+ JSX: widget colapsable de capacidad por cuenta padre');

  h3('client/src/pages/admin/CuentasPadrePage.jsx', GREEN);
  bullet('Sin cambios — el gráfico de ocupación ya estaba implementado (líneas 1063-1095)');

  h2('Scripts nuevos');
  h3('generar_informe_planificador.js (este script)', ORANGE);
  bullet('Informe PDF de mejoras con datos en vivo de la BD');

  // ── IMPACTO EN EL NEGOCIO ─────────────────────────────────────────────────
  doc.addPage();
  h1('Impacto Esperado en el Negocio');

  h2('Reducción de interrupciones de servicio');
  p(`El monitor de Cuentas Padre (Mejora A) y el badge de sync pendiente (Mejora C) ` +
    `permiten detectar y resolver vencimientos de cuentas padre ANTES de que afecten a los clientes. ` +
    `Una cuenta padre vencida puede impactar a múltiples pantallas simultáneamente — ` +
    `el costo de una renovación preventiva es significativamente menor que gestionar ` +
    `múltiples quejas y bajas de clientes afectados.`);

  h2('Optimización de ventas de pantallas libres');
  p(`El widget de capacidad (Mejora D) expone directamente qué cuentas tienen pantallas ` +
    `disponibles para nuevos clientes con costo marginal cero. Al momento de generar este ` +
    `informe hay ${d.libres} pantallas libres en el inventario — cada una representa una ` +
    `venta posible sin necesidad de comprar crédito adicional.`);

  h2('Integridad de datos');
  p(`El indicador de sync pendiente (Mejora C) y el preview de sincronización (Mejora B) ` +
    `reducen el riesgo de que el Planificador opere con credenciales o fechas obsoletas. ` +
    `Los datos de autenticación (usuario/contraseña) del Planificador deben coincidir con ` +
    `los de Cuentas Padre para que los clientes puedan conectarse.`);

  // ── PIE DE PÁGINA ─────────────────────────────────────────────────────────
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    if (i === 0) continue; // Portada sin pie
    doc.fillColor(GRAY).font('Helvetica').fontSize(8)
      .text(`ChikisdTV — Informe de Mejoras del Planificador · ${d.fechaCorte}`,
        50, 800, { align: 'left', width: 400 });
    doc.text(`Página ${i + 1} de ${pageCount}`, 50, 800, { align: 'right', width: 495 });
  }

  doc.end();
  console.log(`\n✅  Informe generado: ${OUTPUT}`);
  console.log(`   Datos capturados al ${d.fechaCorte}`);
  console.log(`   ${d.total} pantallas · ${d.cpRows.length} cuentas padre · ${d.libres} pantallas libres\n`);
  await sequelize.close();
}

main().catch(err => {
  console.error('Error generando informe:', err.message);
  process.exit(1);
});
