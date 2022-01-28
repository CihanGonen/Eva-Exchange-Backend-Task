const Sequelize = require("sequelize");

const sequelize = new Sequelize("eva_exchange", "postgres", "Cc4594588", {
  dialect: "postgres",
  host: "localhost",
});

module.exports = sequelize;
