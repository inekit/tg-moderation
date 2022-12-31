const { AppDataSource } = require("../../data-source");

const { Pool, Client } = require("pg");

const { SUBSCRIPTION_CONN_STR: connectionString } = process.env;

function createConnection() {
  return new Pool({ connectionString });
}

function sessionConnection() {
  let con = new Pool({ connectionString });

  //con.query('select * from session').then((res) => console.log(res));

  con.on("error", function (err) {
    console.log("cannot connect session", err);
  });

  return con;
}

module.exports = { createConnection, sessionConnection };
