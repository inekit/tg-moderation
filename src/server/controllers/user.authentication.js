const passport = require("../passport/passport");
const bcrypt = require("bcryptjs");
const tOrmCon = require("../../db/connection");
require("dotenv").config();
const salt = process.env.SALT;
const usersService = require("../services/users.service");
const {
  HttpError,
  MySqlError,
  NotFoundError,
  NoInputDataError,
} = require("../utils/httpErrors");

function loginLocal(req, res, next) {
  passport.authenticate("local", function (err, user) {
    if (err) {
      return next(err);
    }

    if (!user) {
      console.log("Укажите правильный email или пароль!");
      return next(new Error("Укажите правильный email или пароль!"));
    }

    req.logIn(user, function (err) {
      if (err) {
        return next(err);
      }

      return res.send(JSON.stringify({ isAutenticated: true }));
    });
  })(req, res, next);
}

function registerLocal(req, res) {
  if (!req.body.password || !req.body.email)
    return res.status(500).send({ error: "no data" });

  let password = bcrypt.hashSync(req.body.password, salt);
  const user = { user_id: req.body.email, password, nick: req.body.nick };

  usersService
    .editUser(user)
    .then((userData) => res.send({ isRegistered: true }))
    .catch((err) => {
      console.log(err);
      res.status(500).send({ isRegistered: false });
    });
}

function editUser(req, res) {
  if (!req.body.password || !req.body.nick || !req.body.email)
    return res.send({ error: "no data" });

  let password = bcrypt.hashSync(req.body.password, salt);
  const user = {
    id: req.session.passport.user.toString(),
    user_id: req.body.user_id,
    password,
    nick: req.body.nick,
  };

  usersService
    .editUser(user)
    .then((userData) => res.send({ isRegistered: true }))
    .catch((err) => res.send({ isRegistered: false }));
}

const auth = (req, res, next) => {
  console.log(123, req.isAuthenticated());
  console.log("/ ", req.sessionID);
  if (req.isAuthenticated()) {
    next();
  } else {
    return res.status(500).send(JSON.stringify({ isAutenticated: false }));
  }
};

const authAdmin = (req, res, next) => {
  next();
  /*
  console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    next();
  } else {
    return res.send(JSON.stringify({ isAutenticated: false }));
  }*/
};

module.exports = {
  login: {
    local: loginLocal,
  },
  register: { local: registerLocal },
  auth,
  authAdmin: auth,
  editUser,
};
