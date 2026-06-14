const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const path = require('path');
const XLSX = require('xlsx');
const { Client, TablaCliente } = require('../../models');
const asyncHandler = require('../../middleware/asyncHandler');

// ─── Tabla Clientes (DB + Excel import) ──────────────────────────────────────
async function importTablaClientes() {
  const filePath = path.join(__dirname, '../../../Tablas/Tabla_Clientes.xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const headers = raw[0].map(h => (h || '').toString().trim());
  const records = [];
  for (const row of raw.slice(1)) {
    if (!row[0]) continue;
    const obj = {};
    headers.forEach((h, j) => { obj[h] = row[j] ?? null; });
    records.push({
      customerId:  String(obj['Customer_id'] || ''),
      nombre:      obj['Nombre']          || null,
      apellido:    obj['Apellido']        || null,
      genero:      obj['Genero']          || null,
      pais:        obj['Pais']            || null,
      ciudad:      obj['Ciudad']          || null,
      tipoCliente: obj['Tipo de Cliente'] || null,
      concatenar:  obj['Concatenar']      || null,
      referido:    obj['Referido']        || null,
    });
  }
  if (records.length > 0) {
    await TablaCliente.bulkCreate(records, {
      updateOnDuplicate: ['nombre', 'apellido', 'genero', 'pais', 'ciudad', 'tipoCliente', 'concatenar', 'referido'],
    });
  }
  return records.length;
}

router.get('/clients/tabla-clientes', asyncHandler(async (_req, res) => {
  const count = await TablaCliente.count();
  if (count === 0) await importTablaClientes();
  const rows = await TablaCliente.findAll({ order: [['customerId', 'DESC']] });
  res.json(rows);
}));

router.get('/clients/tabla-clientes/next-id', asyncHandler(async (_req, res) => {
  const all = await TablaCliente.findAll({ attributes: ['customerId'] });
  const nums = all.map(r => parseInt(r.customerId, 10)).filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  res.json({ nextId: String(next) });
}));

router.post('/clients/tabla-clientes/import', asyncHandler(async (_req, res) => {
  const count = await importTablaClientes();
  res.json({ message: `${count} clientes importados desde Excel` });
}));

router.post('/clients/tabla-clientes', asyncHandler(async (req, res) => {
  const record = await TablaCliente.create(req.body);
  res.status(201).json(record);
}));

router.put('/clients/tabla-clientes/:customerId', asyncHandler(async (req, res) => {
  await TablaCliente.update(req.body, { where: { customerId: req.params.customerId } });
  const record = await TablaCliente.findByPk(req.params.customerId);
  res.json(record);
}));

router.delete('/clients/tabla-clientes/:customerId', asyncHandler(async (req, res) => {
  await TablaCliente.destroy({ where: { customerId: req.params.customerId } });
  res.json({ message: 'Cliente eliminado' });
}));

// ============ CLIENTS CRUD ============
router.get('/clients', asyncHandler(async (_req, res) => {
  const clients = await Client.findAll({ order: [['createdAt', 'DESC']] });
  res.json(clients);
}));

router.get('/clients/:id', asyncHandler(async (req, res) => {
  const client = await Client.findByPk(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(client);
}));

router.post('/clients', asyncHandler(async (req, res) => {
  const { name, email, phone, cedula, customerId, estatus, observaciones } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre es requerido' });

  // Clientes son registros de suscriptores, no usuarios de la plataforma
  const hashed = await bcrypt.hash('no-login', 10);
  const client = await Client.create({
    name, email: email || `cliente_${Date.now()}@chikisdtv.local`, phone, cedula, customerId,
    password: hashed,
    role: 'user',
    estatus: estatus || 'Activo',
    observaciones
  });
  res.status(201).json(client);
}));

router.put('/clients/:id', asyncHandler(async (req, res) => {
  const updates = { ...req.body };
  if (updates.password) {
    updates.password = await bcrypt.hash(updates.password, 10);
  } else {
    delete updates.password;
  }
  await Client.update(updates, { where: { id: req.params.id } });
  const client = await Client.findByPk(req.params.id);
  res.json(client);
}));

router.delete('/clients/:id', asyncHandler(async (req, res) => {
  await Client.destroy({ where: { id: req.params.id } });
  res.json({ message: 'Cliente eliminado' });
}));

module.exports = router;
