const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Planificador = sequelize.define('Planificador', {
  idPantalla:   { type: DataTypes.STRING, primaryKey: true },
  cuentaId:     { type: DataTypes.STRING, allowNull: false },
  cuenta:       DataTypes.STRING,
  password:     DataTypes.STRING,
  credito:      DataTypes.FLOAT,
  inicio:       DataTypes.DATEONLY,
  finalizacion: DataTypes.DATEONLY,
  nombre:       DataTypes.STRING,
  apellido:     DataTypes.STRING,
  customerId:   DataTypes.STRING,
  nickname:     DataTypes.STRING,
  pantallas:    DataTypes.INTEGER,
  duracionPlan: DataTypes.FLOAT,
  inicioReal:   DataTypes.DATEONLY,
  duracionReal: DataTypes.DATEONLY,
  alertaReal:   DataTypes.STRING,
  porcentaje:   DataTypes.FLOAT,
  debe:         { type: DataTypes.BOOLEAN, defaultValue: false },
  montoDebe:    DataTypes.FLOAT,   // deuda en pesos colombianos (COP)
  montoDebeUSD: DataTypes.FLOAT,   // deuda en dólares (USD) — cartera independiente
  tipoPlan:     DataTypes.STRING,
}, {
  tableName: 'planificador',
  timestamps: true,
  indexes: [
    { fields: ['cuentaId'] },
  ]
});

module.exports = Planificador;
