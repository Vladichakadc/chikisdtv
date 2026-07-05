const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Inventario físico de equipos comprados para reventa (Tablas/order_inventario2026.xlsx).
// Una fila = una unidad física identificada por su serie; `serie` enlaza con
// VentaEquipo.serial cuando la unidad se vende (asociación en models/index.js).
const InventarioEquipo = sequelize.define('InventarioEquipo', {
  idInventario:     { type: DataTypes.STRING, primaryKey: true }, // "in001"...
  fechaCompra:      DataTypes.DATEONLY,
  descripcion:      DataTypes.STRING,
  proveedor:        DataTypes.STRING,
  serie:            DataTypes.STRING,   // serial físico — cruza con VentaEquipo.serial
  costoUnitarioUSD: DataTypes.FLOAT,
  envioUSD:         DataTypes.FLOAT,
  impuestosUSD:     DataTypes.FLOAT,
  transporteCOP:    DataTypes.FLOAT,
  cantidad:         DataTypes.INTEGER,
  totalUSD:         DataTypes.FLOAT,
  trm:              DataTypes.FLOAT,
  costoUniCOP:      DataTypes.FLOAT,
  costoTotalCOP:    DataTypes.FLOAT,
  utilidadPct:      DataTypes.FLOAT,    // porcentaje (18.2), no fracción
  precioSugerido:   DataTypes.FLOAT,
  ganancia:         DataTypes.FLOAT,
  estado:           DataTypes.STRING,   // "En Bodega", "Vendido", ...
}, {
  tableName: 'inventario_equipos',
  timestamps: true,
  indexes: [
    { fields: ['serie'] },
  ]
});

module.exports = InventarioEquipo;
