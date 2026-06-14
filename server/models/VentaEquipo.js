const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VentaEquipo = sequelize.define('VentaEquipo', {
  idVM:           { type: DataTypes.STRING, primaryKey: true },
  customerId:     DataTypes.STRING,
  nombre:         DataTypes.STRING,
  apellido:       DataTypes.STRING,
  sku:            DataTypes.STRING,
  tipoFire:       DataTypes.STRING,
  idPantalla:     DataTypes.STRING,   // Pantalla del Planificador (ej. M001-1)
  serial:         DataTypes.STRING,   // Serial físico del equipo vendido
  nickname:       DataTypes.STRING,
  cuentaId:       DataTypes.STRING,
  cuenta:         DataTypes.STRING,
  estado:         DataTypes.STRING,
  costo:          DataTypes.FLOAT,
  cortesia:       DataTypes.STRING,
  pantallas:      DataTypes.INTEGER,
  fechaAlta:      DataTypes.DATEONLY,
  fecha:          DataTypes.DATEONLY,
  anio:           DataTypes.STRING,
  mes:            DataTypes.STRING,
  precioVenta:    DataTypes.FLOAT,
  medioPago:      DataTypes.STRING,
  itemQuantity:   DataTypes.INTEGER,
  tipoPago:       DataTypes.STRING,
  tipoPlan:       DataTypes.STRING,
  tipoPantalla:   DataTypes.STRING,
  cuentaDedicada: DataTypes.STRING,
}, { tableName: 'ventas_equipos', timestamps: true });

module.exports = VentaEquipo;
