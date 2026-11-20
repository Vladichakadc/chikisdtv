const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { normalizarMedioPago } = require('../utils/medioPago');

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

// "Nu", "UN" o "Nu Bank" se guardan siempre como "NU" (utils/medioPago.js)
Venta.addHook('beforeSave', (r) => { if (r.changed('medioPago')) r.medioPago = normalizarMedioPago(r.medioPago); });

module.exports = Venta;
