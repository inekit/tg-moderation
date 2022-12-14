const { AppDataSource } = require("../../data-source");

const connection = AppDataSource.initialize();

module.exports = connection;
