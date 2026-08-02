const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Almacén clave/valor genérico para configuraciones simples de la app que
// necesitan persistir (p. ej. el saldo actual de créditos de Cuentas Padre en
// Proyección de Recargas) sin ameritar una tabla dedicada propia.
const Setting = sequelize.define('Setting', {
  key:   { type: DataTypes.STRING, primaryKey: true },
  value: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'settings',
  timestamps: true,
});

module.exports = Setting;
