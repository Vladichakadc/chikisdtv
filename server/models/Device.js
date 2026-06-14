const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Device = sequelize.define('Device', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  clientId: { type: DataTypes.INTEGER, allowNull: false },
  subscriptionId: { type: DataTypes.INTEGER },
  nombre: { type: DataTypes.STRING, allowNull: false },
  tipo: {
    type: DataTypes.ENUM('Smart TV', 'PC', 'Celular', 'Tablet', 'Otro'),
    defaultValue: 'Smart TV'
  },
  mac: { type: DataTypes.STRING, unique: true },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  observaciones: { type: DataTypes.TEXT }
}, {
  tableName: 'devices',
  timestamps: true,
  indexes: [
    { fields: ['clientId'] },
    { fields: ['subscriptionId'] },
  ]
});

module.exports = Device;
