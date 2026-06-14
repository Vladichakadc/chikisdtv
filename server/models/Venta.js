const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Venta = sequelize.define('Venta', {
  idVM:           { type: DataTypes.STRING, primaryKey: true },
  customerId:     DataTypes.STRING,
  nombre:         DataTypes.STRING,
  apellido:       DataTypes.STRING,
  sku:            DataTypes.STRING,
  tipoFire:       DataTypes.STRING,
  idPantalla:     DataTypes.STRING,
  nickname:       DataTypes.STRING,
  cuentaId:       DataTypes.STRING,
  cuenta:         DataTypes.STRING,
  estado:         DataTypes.STRING,
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
}, {
  tableName: 'ventas',
  timestamps: true,
  indexes: [
    { fields: ['anio', 'mes'] },
    { fields: ['customerId'] },
    { fields: ['tipoPago'] },
  ]
});

module.exports = Venta;
