const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const tOrmCon = require("../../db/connection");

passport.serializeUser(function (user, done) {
  console.log("Сериализация: ", user.id);
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  console.log("Десериализация: ", id);

  tOrmCon.then((connection) => {
    const userRep = connection.getRepository("Admin");

    userRep
      .findOne({ where: { id: id } })
      .then(function (user) {
        console.log(1, user);
        return connection
          .getRepository("Admin")
          .findOne({ where: { user: { id } } })
          .then(() => {
            user.isAdmin = true;
            return done(null, user);
          })
          .catch(() => {
            return done(null, user);
          });
      })
      .catch(function (error) {
        userRep
          .findOne({ where: { vkId: id } })
          .then(function (user) {
            console.log(1, user);
            done(null, user);
          })
          .catch(function (error) {
            done(null, false);
          });
      });
  });
});

passport.use(
  new LocalStrategy({ usernameField: "email" }, function (
    email,
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
              email === userN.email &&
              bcrypt.compareSync(password, userN.password)
            ) {
              console.log("логин правильный, вы ", userN.id);

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
