const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { cifrar, descifrar } = require('../utils/cifrado');

const CuentaPadre = sequelize.define('CuentaPadre', {
  cuentaId:      { type: DataTypes.STRING, primaryKey: true },
  nombreUsuario: DataTypes.STRING,
  // Única copia de la contraseña de la cuenta (el Planificador ya no la duplica).
  // Se guarda cifrada (utils/cifrado.js); al leerla con el modelo se descifra.
  // OJO: las consultas raw:true devuelven el valor cifrado — usar descifrar().
  contrasena:    {
    type: DataTypes.STRING,
    set(v) { this.setDataValue('contrasena', cifrar(v)); },
    get() { return descifrar(this.getDataValue('contrasena')); },
  },
  credito:       DataTypes.INTEGER,
  fechaInicio:   DataTypes.STRING,
  fechaFin:      DataTypes.STRING,
  smartTv:       DataTypes.STRING,
  estado:        DataTypes.STRING,
}, { tableName: 'cuentas_padre', timestamps: true });

module.exports = CuentaPadre;
