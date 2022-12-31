const express = require("express");
const app = express();

const session = require("express-session");
var sessionConnection = require("../db/sessionConnection").sessionConnection();
const MySQLStore = require("express-mysql-session")(session);
const pgSession = require("express-pg-session")(session);
const {
  errorLogger,
  errorResponder,
  invalidPathHandler,
  failSafeHandler,
} = require("./middlewares/errorMiddleware");

/*var sessionStore = new pgSession({
  pool: sessionConnection,
  tableName: 'session',
  /*
columnNames: {
    sid: 'session_id',
    expire: 'expires',
    sess: 'data',
    session_id: 'sid',
    expires: 'expire',
    data: 'sess',
  },

  //expiration: 10800000,
  //createDatabaseTable: true,
});
*/

app.set("trust proxy", 1);

app.use(
  session({
    secret: "1234",
    //store: sessionStore,
    cookie: {
      path: "/",
      httpOnly: false,
      resave: false,
      maxAge: 60 * 60 * 1000,
      secure: true,
    },
    resave: false,
    saveUninitialized: true,
  })
);

app.use(errorLogger);
app.use(errorResponder);
app.use(failSafeHandler);
//app.use(invalidPathHandler);

module.exports = app;
