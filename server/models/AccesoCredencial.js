// Bitácora de quién vio contraseñas de cuentas padre del Planificador, cuándo
// y desde dónde (tabla, Estatus Cliente, comprobante, edición, exportación).
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AccesoCredencial = sequelize.define('AccesoCredencial', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuarioId:    DataTypes.INTEGER,
  usuarioEmail: DataTypes.STRING,
  motivo:       { type: DataTypes.STRING, allowNull: false },
  cantidad:     { type: DataTypes.INTEGER, defaultValue: 0 },
  idPantallas:  DataTypes.TEXT,   // JSON con los idPantalla revelados
  ip:           DataTypes.STRING,
}, {
  tableName: 'acceso_credenciales',
  timestamps: true,
  updatedAt: false,
});

module.exports = AccesoCredencial;
