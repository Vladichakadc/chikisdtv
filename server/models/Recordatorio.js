// Registro de cada recordatorio de pago / comprobante enviado a un cliente
// desde el Planificador. Permite ver "Recordado hace N días" en Vencidas y
// medir cuántas pantallas renovaron después del recordatorio.
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Recordatorio = sequelize.define('Recordatorio', {
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  idPantalla:      { type: DataTypes.STRING, allowNull: false },
  nickname:        DataTypes.STRING,
  customerId:      DataTypes.STRING,
  tipo:            { type: DataTypes.STRING, allowNull: false },   // 'renovacion' | 'comprobante'
  canal:           { type: DataTypes.STRING, allowNull: false },   // 'whatsapp' | 'copiado'
  estadoAlEnviar:  DataTypes.STRING,                                // VENCIDO / ALERTA / VIGENTE
  diasAlEnviar:    DataTypes.INTEGER,
  finPlanAlEnviar: DataTypes.DATEONLY,                              // para detectar si luego renovó
  usuarioEmail:    DataTypes.STRING,
}, {
  tableName: 'recordatorios',
  timestamps: true,
  updatedAt: false,
});

module.exports = Recordatorio;
