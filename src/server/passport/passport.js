const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const tOrmCon = require("../../db/connection");

passport.serializeUser(function (user, done) {
  console.log("Сериализация: ", user.user_id);
  done(null, user.user_id);
});

passport.deserializeUser(function (user_id, done) {
  console.log("Десериализация: ", user_id);

  tOrmCon.then((connection) => {
    const userRep = connection.getRepository("Admin");

    userRep.findOne({ where: { user_id } }).then(function (user) {
      console.log(1, user);
      return done(null, user);
    });
  });
});

passport.use(
  new LocalStrategy({ usernameField: "email" }, function (
    user_id,
    password,
    done
  ) {
    tOrmCon.then((connection) => {
      const userRep = connection.getRepository("Admin");

      userRep
        .find()
        .then(function (allUsers) {
          //console.log("All users: ", allUsers);

          if (!allUsers) return done(error, false);

          for (const userN of allUsers) {
            if (
              user_id === userN.user_id &&
              bcrypt.compareSync(password, userN.password)
            ) {
              console.log("логин правильный, вы ", userN.user_id);

              return done(null, userN);
            }
          }

          console.log("логин неправильный");
          return done(null, false);
        })
        .catch(function (error) {
          console.log("Ошибка доступа", error);
          done(null, false);
        });
    });
  })
);

module.exports = passport;
