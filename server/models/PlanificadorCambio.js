// Historial de cambios del Planificador: cada edición, alta, baja, renovación
// o sincronización deja quién, cuándo, el antes y el después de la pantalla.
// Permite deshacer un cambio concreto en el servidor (sin el viejo "restaurar
// toda la tabla desde el navegador") y sirve de auditoría.
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PlanificadorCambio = sequelize.define('PlanificadorCambio', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  lote:         DataTypes.STRING,                       // agrupa cambios de una misma operación (sincronizar)
  accion:       { type: DataTypes.STRING, allowNull: false }, // editar | crear | eliminar | renovar | sincronizar | deshacer
  idPantalla:   { type: DataTypes.STRING, allowNull: false },
  campos:       DataTypes.TEXT,                         // JSON: campos que cambiaron
  antes:        DataTypes.TEXT,                         // JSON (sin contraseña)
  despues:      DataTypes.TEXT,                         // JSON (sin contraseña)
  ventaId:      DataTypes.STRING,                       // renovación: venta creada en Pagos
  usuarioEmail: DataTypes.STRING,
  deshecho:     { type: DataTypes.BOOLEAN, defaultValue: false },
  deshechoPor:  DataTypes.STRING,
  deshechoEn:   DataTypes.DATE,
  deshaceId:    DataTypes.INTEGER,                      // en accion=deshacer: el cambio que revirtió
}, {
  tableName: 'planificador_cambios',
  timestamps: true,
  updatedAt: false,
});

module.exports = PlanificadorCambio;
