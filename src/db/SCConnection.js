const { Pool, Client } = require('pg')

const {
    SUBSCRIPTION_CONN_STR: connectionString,
  } = process.env;

const pool = new Pool({connectionString})


module.exports = pool

