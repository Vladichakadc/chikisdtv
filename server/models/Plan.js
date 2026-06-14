const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Plan = sequelize.define('Plan', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING, allowNull: false },
  precio: { type: DataTypes.FLOAT, allowNull: false },
  duracionDias: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
  numeroPantallas: { type: DataTypes.INTEGER, defaultValue: 1 },
  descripcion: { type: DataTypes.TEXT },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'plans',
  timestamps: true
});

module.exports = Plan;
