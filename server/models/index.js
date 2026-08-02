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
const Setting = require('./Setting');

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

const { getRLSContext } = require('../middleware/rlsContext');

const models = { Client, Plan, Subscription, Payment, Device, Planificador, Baja, TablaCliente, Venta, VentaEquipo, CuentaPadre, CostoPantalla, InventarioEquipo, Setting };

// Activar Row Level Security (RLS) a nivel de Aplicación
function applyRLS(options, modelName) {
  if (options.skipRLS) return; // Permite bypass explícito para procesos internos
  
  const store = getRLSContext();
  const user = store?.get('user');
  
  // Si no hay contexto de usuario o es admin, dejamos pasar la consulta normal
  if (!user || user.role === 'admin') return;

  // Garantizar que options.where sea un objeto
  options.where = options.where || {};

  switch (modelName) {
    case 'Client':
      options.where.id = user.id;
      break;
    case 'VentaEquipo':
    case 'TablaCliente':
      if (user.customerId) {
        options.where.customerId = user.customerId;
      } else {
        options.where.customerId = 'INVALID_ACCESS'; // Bloquea si no tiene customerId
      }
      break;
    case 'Subscription':
    case 'Payment':
    case 'Device':
    case 'Baja':
      options.where.clientId = user.id;
      break;
    case 'Plan':
      // Los planes pueden ser vistos por todos
      break;
    default:
      // Cualquier otra tabla (Inventario, Costos) se bloquea para clientes regulares
      options.where.id = -1; 
      break;
  }
}

// Inyectar los hooks RLS en todos los modelos
Object.keys(models).forEach(modelName => {
  const model = models[modelName];
  
  // Operaciones de lectura y bulk
  model.addHook('beforeFind', (options) => applyRLS(options, modelName));
  model.addHook('beforeCount', (options) => applyRLS(options, modelName));
  model.addHook('beforeBulkUpdate', (options) => applyRLS(options, modelName));
  model.addHook('beforeBulkDestroy', (options) => applyRLS(options, modelName));

  // Operaciones de instancia (verificación de seguridad extra)
  const verifyInstanceRLS = (instance, options) => {
    if (options.skipRLS) return;
    const store = getRLSContext();
    const user = store?.get('user');
    if (!user || user.role === 'admin') return;
    
    let allowed = false;
    switch(modelName) {
      case 'Client': allowed = instance.id === user.id; break;
      case 'VentaEquipo':
      case 'TablaCliente': allowed = instance.customerId === user.customerId; break;
      case 'Subscription':
      case 'Payment':
      case 'Device':
      case 'Baja': allowed = instance.clientId === user.id; break;
      case 'Plan': allowed = true; break;
      default: allowed = false; break;
    }
    
    if (!allowed) throw new Error('RLS Violation: Acceso denegado a este registro');
  };

  model.addHook('beforeUpdate', verifyInstanceRLS);
  model.addHook('beforeDestroy', verifyInstanceRLS);
});

module.exports = models;
