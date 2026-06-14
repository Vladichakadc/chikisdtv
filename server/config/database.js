const { Sequelize } = require('sequelize');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false,
  dialectOptions: { foreignKeys: true }
});

module.exports = sequelize;
