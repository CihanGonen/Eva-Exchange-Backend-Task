const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const Shares = sequelize.define("shares", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: Sequelize.STRING(3),
    allowNull: false,
    unique: true,
  },
  rate: {
    type: Sequelize.INTEGER(2),
    allowNull: false,
  },
});

module.exports = Shares;
