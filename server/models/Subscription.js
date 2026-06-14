const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscription = sequelize.define('Subscription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  clientId: { type: DataTypes.INTEGER, allowNull: false },
  planId: { type: DataTypes.INTEGER, allowNull: false },
  fechaInicio: { type: DataTypes.DATEONLY, allowNull: false },
  fechaVencimiento: { type: DataTypes.DATEONLY, allowNull: false },
  estado: {
    type: DataTypes.ENUM('Activo', 'Vencido', 'Cancelado'),
    defaultValue: 'Activo'
  },
  observaciones: { type: DataTypes.TEXT }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  indexes: [
    { fields: ['clientId'] },
    { fields: ['planId'] },
    { fields: ['estado', 'fechaVencimiento'] },
  ]
});

module.exports = Subscription;
