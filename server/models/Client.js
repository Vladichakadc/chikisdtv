const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Client = sequelize.define('Client', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  customerId: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  phone: { type: DataTypes.STRING },
  cedula: { type: DataTypes.STRING, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'user'), defaultValue: 'user' },
  estatus: { type: DataTypes.ENUM('Activo', 'Inactivo'), defaultValue: 'Activo' },
  mustChangePassword: { type: DataTypes.BOOLEAN, defaultValue: false },
  observaciones: { type: DataTypes.TEXT }
}, {
  tableName: 'clients',
  timestamps: true
});

module.exports = Client;
