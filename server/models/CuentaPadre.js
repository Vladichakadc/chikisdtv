const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CuentaPadre = sequelize.define('CuentaPadre', {
  cuentaId:      { type: DataTypes.STRING, primaryKey: true },
  nombreUsuario: DataTypes.STRING,
  contrasena:    DataTypes.STRING,
  credito:       DataTypes.INTEGER,
  fechaInicio:   DataTypes.STRING,
  fechaFin:      DataTypes.STRING,
  smartTv:       DataTypes.STRING,
  estado:        DataTypes.STRING,
}, { tableName: 'cuentas_padre', timestamps: true });

module.exports = CuentaPadre;
