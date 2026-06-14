const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CostoPantalla = sequelize.define('CostoPantalla', {
  id:                      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  idRec:                   DataTypes.STRING,
  accion:                  DataTypes.STRING,
  creditos:                DataTypes.FLOAT,
  fecha:                   DataTypes.STRING,
  anio:                    DataTypes.STRING,
  mes:                     DataTypes.STRING,
  itemQuantity:            DataTypes.INTEGER,
  costoCOP:                DataTypes.FLOAT,
  impuesto4x100COP:        DataTypes.FLOAT,
  costoUSD:                DataTypes.FLOAT,
  trm:                     DataTypes.FLOAT,
  costoUnitarioCuentaUSD:  DataTypes.FLOAT,
  costoUnitarioCuentaCOP:  DataTypes.FLOAT,
  costoPantallaUSD:        DataTypes.FLOAT,
  costoPantallaCOP:        DataTypes.FLOAT,
  medioPago:               DataTypes.STRING,
}, { tableName: 'costo_pantalla', timestamps: true });

module.exports = CostoPantalla;
