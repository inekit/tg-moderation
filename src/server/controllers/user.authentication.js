const passport = require("../passport/passport");
const bcrypt = require("bcryptjs");
const tOrmCon = require("../../db/connection");
const salt = bcrypt.genSaltSync(10);
const usersService = require("../services/users.service");

function loginLocal(req, res, next) {
  passport.authenticate("local", function (err, user) {
    if (err) {
      return next(err);
    }

    if (!user) {
      console.log("Укажите правильный email или пароль!");
      return res.send(JSON.stringify({ isAutenticated: false }));
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
  if (!req.body.password || !req.body.nick || !req.body.email)
    return res.send({ error: "no data" });

  let password = bcrypt.hashSync(req.body.password, salt);
  const user = { email: req.body.email, password, nick: req.body.nick };

  usersService
    .addUser(user)
    .then((userData) => res.send({ isRegistered: true }))
    .catch((err) => res.send({ isRegistered: false }));
}

function editUser(req, res) {
  if (!req.body.password || !req.body.nick || !req.body.email)
    return res.send({ error: "no data" });

  let password = bcrypt.hashSync(req.body.password, salt);
  const user = {
    id: req.session.passport.user.toString(),
    email: req.body.email,
    password,
    nick: req.body.nick,
  };

  usersService
    .editUser(user)
    .then((userData) => res.send({ isRegistered: true }))
    .catch((err) => res.send({ isRegistered: false }));
}

const auth = (req, res, next) => {
  console.log(req.isAuthenticated());

  if (req.isAuthenticated()) {
    next();
  } else {
    return res.send(JSON.stringify({ isAutenticated: false }));
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
  authAdmin,
  editUser,
};
