const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  clientId: { type: DataTypes.INTEGER, allowNull: false },
  subscriptionId: { type: DataTypes.INTEGER },
  monto: { type: DataTypes.FLOAT, allowNull: false },
  fechaPago: { type: DataTypes.DATEONLY },
  fechaVencimiento: { type: DataTypes.DATEONLY },
  metodoPago: { type: DataTypes.STRING },
  comprobante: { type: DataTypes.STRING },
  estado: {
    type: DataTypes.ENUM('Pagado', 'Pendiente', 'Vencido'),
    defaultValue: 'Pendiente'
  },
  observaciones: { type: DataTypes.TEXT }
}, {
  tableName: 'payments',
  timestamps: true,
  indexes: [
    { fields: ['clientId'] },
    { fields: ['subscriptionId'] },
    { fields: ['estado'] },
    { fields: ['fechaPago'] },
  ]
});

module.exports = Payment;
