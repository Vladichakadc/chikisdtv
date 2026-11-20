const express = require('express');
const router = express.Router();
const path = require('path');
const XLSX = require('xlsx');
const { Venta, Client, Device } = require('../../models');
const asyncHandler = require('../../middleware/asyncHandler');
const { analisisPagos } = require('../../services/analisisPagos');
const { leerExcelOrigen, autoImportarSiDisponible } = require('../../utils/excelOrigen');
const { normalizeTipoPago, sanitizeVentaBody, siguienteIdVenta } = require('../../services/ventasService');

function excelSerial(n) {
  if (typeof n !== 'number') return n || null;
  return new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().split('T')[0];
}

async function importVentas() {
  const filePath = path.join(__dirname, '../../../Tablas/1-orders_table_Ventas_LicenciaIPVT2024.xlsx');
  const wb = leerExcelOrigen(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const records = raw.slice(1)
    .filter(row => row[0])
    .map(row => ({
      idVM:           String(row[0]),
      customerId:     row[1]  != null ? String(row[1])  : null,
      nombre:         row[2]  || null,
      apellido:       row[3]  || null,
      sku:            row[4]  || null,
      tipoFire:       row[5]  || null,
      idPantalla:     row[6]  || null,
      nickname:       row[7]  || null,
      cuentaId:       row[8]  || null,
      cuenta:         row[9]  || null,
      estado:         row[10] || null,
      cortesia:       row[11] || null,
      pantallas:      row[12] != null ? Number(row[12]) : null,
      fechaAlta:      excelSerial(row[13]),
      fecha:          excelSerial(row[14]),
      anio:           row[15] != null ? String(row[15]) : null,
      mes:            row[16] || null,
      precioVenta:    row[17] != null ? Number(row[17]) : null,
      medioPago:      row[18] || null,
      itemQuantity:   row[19] != null ? Number(row[19]) : null,
      tipoPago:       normalizeTipoPago(row[20]) || null,
      tipoPlan:       row[21] || null,
      tipoPantalla:   row[22] || null,
      cuentaDedicada: row[23] || null,
    }));
  await Venta.bulkCreate(records, {
    updateOnDuplicate: [
      'customerId','nombre','apellido','sku','tipoFire','idPantalla','nickname',
      'cuentaId','cuenta','estado','cortesia','pantallas','fechaAlta','fecha',
      'anio','mes','precioVenta','medioPago','itemQuantity','tipoPago',
      'tipoPlan','tipoPantalla','cuentaDedicada','updatedAt',
    ],
  });
  return records.length;
}

function mapTipoFireToDeviceType(tipoFire) {
  if (!tipoFire) return 'Otro';
  const t = tipoFire.toLowerCase();
  if (t.includes('tv') || t.includes('fire') || t.includes('onn') || t.includes('stick') || t.includes('cube') || t.includes('pantalla')) return 'Smart TV';
  if (t.includes('pc') || t.includes('computador')) return 'PC';
  if (t.includes('celular') || t.includes('phone')) return 'Celular';
  if (t.includes('tablet')) return 'Tablet';
  return 'Otro';
}

// ============ VENTAS LICENCIA CRUD ============
router.get('/payments/ventas-licencia/next-id', asyncHandler(async (_req, res) => {
  res.json({ nextId: await siguienteIdVenta() });
}));

router.post('/payments/ventas-licencia/import', asyncHandler(async (_req, res) => {
  const count = await importVentas();
  res.json({ imported: count });
}));

// Análisis de Pagos (services/analisisPagos.js). ?hoy=AAAA-MM-DD permite ver
// el análisis a una fecha de corte. Filtros: periodo (12m|todo|personalizado),
// anios, meses (1-12), medios, tipos, planes — listas separadas por coma.
router.get('/payments/analisis', asyncHandler(async (req, res) => {
  const hoy = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.hoy || '')) ? String(req.query.hoy) : undefined;
  const { periodo, anios, meses, medios, tipos, planes } = req.query;
  res.json(await analisisPagos({ hoy, filtros: { periodo, anios, meses, medios, tipos, planes } }));
}));

router.get('/payments/ventas-licencia', asyncHandler(async (_req, res) => {
  const count = await Venta.count();
  if (count === 0) await autoImportarSiDisponible(importVentas);
  const rows = await Venta.findAll({ order: [['fecha', 'DESC']] });
  res.json(rows);
}));

router.get('/payments/ventas-dispositivos', asyncHandler(async (_req, res) => {
  const count = await Venta.count();
  if (count === 0) await autoImportarSiDisponible(importVentas);
  
  const { Op } = require('sequelize');
  const rows = await Venta.findAll({
    where: {
      [Op.or]: [
        { tipoPago: { [Op.like]: '%Activacion%' } },
        { tipoPago: { [Op.like]: '%Activación%' } },
        { tipoPago: { [Op.like]: '%Pantalla%' } },
        { tipoFire: { [Op.not]: null, [Op.ne]: '' } }
      ]
    },
    order: [['fecha', 'DESC']]
  });
  res.json(rows);
}));

router.post('/payments/ventas-licencia', asyncHandler(async (req, res) => {
  const data = sanitizeVentaBody(req.body);
  if (!data.idVM) return res.status(400).json({ error: 'El ID de Venta (idVM) es obligatorio' });
  const venta = await Venta.create(data);

  if ((data.tipoPago === 'Activacion Pantalla' || data.tipoPago === 'Activacion') && data.customerId) {
    const client = await Client.findOne({ where: { customerId: data.customerId } });
    if (client) {
      const macOId = data.idPantalla || data.nickname || `UNKNOWN-${Date.now()}`;
      await Device.findOrCreate({
        where: { mac: macOId },
        defaults: {
          clientId: client.id,
          nombre: data.nickname || data.idPantalla || 'Dispositivo Nuevo',
          tipo: mapTipoFireToDeviceType(data.tipoFire),
          mac: macOId,
          activo: data.estado !== 'Desactivado' && data.estado !== 'Baja'
        }
      });
    }
  }

  res.status(201).json(venta);
}));

router.put('/payments/ventas-licencia/:idVM', asyncHandler(async (req, res) => {
  const venta = await Venta.findByPk(req.params.idVM);
  if (!venta) return res.status(404).json({ error: 'No encontrado' });
  const data = sanitizeVentaBody(req.body);
  delete data.idVM; // la PK no se modifica desde el formulario de edición
  await venta.update(data);
  res.json(venta);
}));

router.delete('/payments/ventas-licencia/:idVM', asyncHandler(async (req, res) => {
  const venta = await Venta.findByPk(req.params.idVM);
  if (!venta) return res.status(404).json({ error: 'No encontrado' });
  await venta.destroy();
  res.json({ ok: true });
}));

// Ingresos por tipo de plan y año (para gráfica de composición por años)
router.get('/payments/ventas-licencia-by-plan-year', asyncHandler(async (_req, res) => {
  try {
    const { Sequelize } = require('sequelize');
    const { Op } = Sequelize;

    // Validar que la tabla Venta tenga datos
    const totalCount = await Venta.count();
    if (totalCount === 0) {
      return res.json({
        series: [],
        tiposPlanes: [],
        _debug: 'Tabla Venta vacía'
      });
    }

    // Ejecutar query de agregación
    const data = await Venta.findAll({
      attributes: [
        'anio',
        'tipoPlan',
        [Sequelize.fn('SUM', Sequelize.col('precioVenta')), 'totalIngreso'],
        [Sequelize.fn('COUNT', Sequelize.col('idVM')), 'cantidadVentas']
      ],
      where: {
        anio: { [Op.not]: null },
        tipoPlan: { [Op.not]: null }
      },
      group: ['anio', 'tipoPlan'],
      raw: true,
      order: [['anio', 'DESC'], ['totalIngreso', 'DESC']]
    });

    if (!Array.isArray(data)) {
      console.error('⚠️ Unexpected query result type:', typeof data);
      return res.json({
        series: [],
        tiposPlanes: [],
        _debug: 'Query result was not an array'
      });
    }

    // Transformar a estructura de tiempo serie por año
    const porAnioYPlan = {};
    data.forEach(row => {
      if (!row.anio || !row.tipoPlan) return; // Skip invalid rows
      if (!porAnioYPlan[row.anio]) {
        porAnioYPlan[row.anio] = { anio: row.anio, total: 0 };
      }
      const ingreso = Math.round(Number(row.totalIngreso) || 0);
      porAnioYPlan[row.anio][row.tipoPlan] = ingreso;
      porAnioYPlan[row.anio].total += ingreso;
    });

    // Identificar todos los tipos de plan únicos
    const tiposPlanes = new Set();
    data.forEach(row => {
      if (row.tipoPlan) tiposPlanes.add(row.tipoPlan);
    });

    const series = Object.values(porAnioYPlan).sort((a, b) => a.anio.localeCompare(b.anio));
    const tipos = Array.from(tiposPlanes).sort();

    res.json({
      series,
      tiposPlanes: tipos
    });

  } catch (innerErr) {
    console.error('❌ Error en /payments/ventas-licencia-by-plan-year:', innerErr.message);
    return res.status(500).json({
      error: 'Error al procesar datos de ingresos por plan',
      message: innerErr.message
    });
  }
}));

module.exports = router;
