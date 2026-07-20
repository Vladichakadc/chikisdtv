const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Baja = sequelize.define('Baja', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  idBaja: { type: DataTypes.STRING, unique: true, comment: 'Código de baja (ej: BAJA148)' },
  customerId: { type: DataTypes.STRING, comment: 'Código del cliente' },
  clientId: { type: DataTypes.INTEGER, comment: 'FK opcional a clients' },
  nombre: { type: DataTypes.STRING },
  apellido: { type: DataTypes.STRING },
  sku: { type: DataTypes.STRING },
  tipoFire: { type: DataTypes.STRING, comment: 'Tipo de Fire TV' },
  devolucion: { type: DataTypes.STRING },
  nickname: { type: DataTypes.STRING },
  estado: { type: DataTypes.STRING, defaultValue: 'Baja' },
  cortesia: { type: DataTypes.STRING },
  pantallas: { type: DataTypes.INTEGER, defaultValue: 1, comment: 'Número de pantallas' },
  fechaBaja: { type: DataTypes.DATEONLY, comment: 'Fecha de la baja' },
  // OJO: pese al nombre del campo original en Excel, NO es la fecha de activación
  // del cliente — está casi siempre a pocos días de fechaBaja (fecha de inicio del
  // último ciclo de facturación). Para la vida real del cliente usar el cruce con
  // Venta.tipoPago='Activacion Pantalla' (ver dashboard-bi → activacionPorCliente).
  fecha: { type: DataTypes.DATEONLY, comment: 'Fecha de inicio del último ciclo (NO es la activación original; ver comentario)' },
  anio: { type: DataTypes.INTEGER },
  mes: { type: DataTypes.STRING },
  itemQuantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  tipoPlan: { type: DataTypes.STRING },
  tipoPantalla: { type: DataTypes.STRING },
  cuentaDedicada: { type: DataTypes.STRING },
  motivo: { type: DataTypes.TEXT, comment: 'Motivo de la baja' },
  observaciones: { type: DataTypes.TEXT }
}, {
  tableName: 'bajas',
  timestamps: true,
  indexes: [
    { fields: ['clientId'] },
    { fields: ['anio'] },
  ]
});

module.exports = Baja;
