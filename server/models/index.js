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

module.exports = { Client, Plan, Subscription, Payment, Device, Planificador, Baja, TablaCliente, Venta, VentaEquipo, CuentaPadre, CostoPantalla };
