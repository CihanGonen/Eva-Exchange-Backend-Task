const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const User_shares = sequelize.define("user_shares", {
  quantity: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  userId: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  shareId: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  onSale: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
  },
});

module.exports = User_shares;
