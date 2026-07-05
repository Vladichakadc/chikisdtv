const Client = require('./Client');
const Plan = require('./Plan');
const Subscription = require('./Subscription');
const Payment = require('./Payment');
const Device = require('./Device');
const Planificador = require('./Planificador');
const Baja = require('./Baja');
const TablaCliente = require('./TablaCliente');
const Venta = require('./Venta');
const VentaEquipo = require('./VentaEquipo');
const CuentaPadre = require('./CuentaPadre');
const CostoPantalla = require('./CostoPantalla');
const InventarioEquipo = require('./InventarioEquipo');

// Client associations
Client.hasMany(Subscription, { foreignKey: 'clientId', as: 'subscriptions' });
Client.hasMany(Payment, { foreignKey: 'clientId', as: 'payments' });
Client.hasMany(Device, { foreignKey: 'clientId', as: 'devices' });

// Plan associations
Plan.hasMany(Subscription, { foreignKey: 'planId', as: 'subscriptions' });

// Subscription associations
Subscription.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Subscription.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });
Subscription.hasMany(Payment, { foreignKey: 'subscriptionId', as: 'payments' });
Subscription.hasMany(Device, { foreignKey: 'subscriptionId', as: 'devices' });

// Payment associations
Payment.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Payment.belongsTo(Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });

// Device associations
Device.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Device.belongsTo(Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });

// Baja associations
Baja.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Client.hasMany(Baja, { foreignKey: 'clientId', as: 'bajas' });

// VentaEquipo ↔ Client / TablaCliente: la venta de un dispositivo físico se
// vincula por customerId (clave de negocio compartida por ambas tablas).
// constraints:false — el Excel puede traer customerIds sin cliente registrado aún.
VentaEquipo.belongsTo(Client, { foreignKey: 'customerId', targetKey: 'customerId', as: 'client', constraints: false });
Client.hasMany(VentaEquipo, { foreignKey: 'customerId', sourceKey: 'customerId', as: 'ventasEquipos', constraints: false });
VentaEquipo.belongsTo(TablaCliente, { foreignKey: 'customerId', targetKey: 'customerId', as: 'tablaCliente', constraints: false });
TablaCliente.hasMany(VentaEquipo, { foreignKey: 'customerId', sourceKey: 'customerId', as: 'ventasEquipos', constraints: false });

// InventarioEquipo ↔ VentaEquipo: la unidad física del inventario se enlaza
// con su venta a través del serial del equipo (serie = VentaEquipo.serial).
// constraints:false — no es FK dura: las unidades "En Bodega" aún no tienen venta.
InventarioEquipo.belongsTo(VentaEquipo, { foreignKey: 'serie', targetKey: 'serial', as: 'venta', constraints: false });
VentaEquipo.hasOne(InventarioEquipo, { foreignKey: 'serie', sourceKey: 'serial', as: 'inventario', constraints: false });

module.exports = { Client, Plan, Subscription, Payment, Device, Planificador, Baja, TablaCliente, Venta, VentaEquipo, CuentaPadre, CostoPantalla, InventarioEquipo };
