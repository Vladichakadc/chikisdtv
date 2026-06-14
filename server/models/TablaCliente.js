const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TablaCliente = sequelize.define('TablaCliente', {
  customerId:  { type: DataTypes.STRING, primaryKey: true },
  nombre:      DataTypes.STRING,
  apellido:    DataTypes.STRING,
  genero:      DataTypes.STRING,
  pais:        DataTypes.STRING,
  ciudad:      DataTypes.STRING,
  tipoCliente: DataTypes.STRING,
  concatenar:  DataTypes.STRING,
  referido:    DataTypes.STRING,
  movil:       DataTypes.STRING,
}, {
  tableName: 'tabla_clientes',
  timestamps: true,
  indexes: [
    { fields: ['tipoCliente'] },
    { fields: ['pais'] },
  ]
});

module.exports = TablaCliente;
