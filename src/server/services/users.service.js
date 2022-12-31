const tOrmCon = require("../../db/connection");
const checkInputData = require("../utils/checkInputData");
const {
  HttpError,
  MySqlError,
  NotFoundError,
  NoInputDataError,
} = require("../utils/httpErrors");

class UsersService {
  getUsers(id, page, take) {
    return new Promise((res, rej) => {
      const filteres = {};
      if (id) filteres.toCode = id;

      take = take || 10;
      page = page || 1;
      let skip = (page - 1) * take;
      console.log(skip, take);

      tOrmCon.then((connection) => {
        connection
          .getRepository("Admin")
          .find({ where: filteres, skip, take })
          .then((data) => res(data))
          .catch((error) => rej(new MySqlError(error)));
      });
    });
  }

  addUser(user) {
    return new Promise((res, rej) => {
      if (!checkInputData(user, "password", "nick", "email"))
        return rej(
          new NoInputDataError({
            password: user?.password,
            nick: user?.nick,
            email: user?.email,
          })
        );

      tOrmCon.then((connection) => {
        connection
          .getRepository("Admin")
          .save(user)
          .then((data) => res(data))
          .catch((error) => rej(new MySqlError(error)));
      });
    });
  }

  deleteUser(id) {
    return new Promise((res, rej) => {
      if (!id) return rej(new NoInputDataError({ id: id }));

      const filteres = {};
      if (id) filteres.toCode = id;

      tOrmCon.then((connection) => {
        connection
          .getRepository("Admin")
          .delete({ id })
          .then((data) => res(data))
          .catch((error) => rej(new MySqlError(error)));
      });
    });
  }

  editUser(user) {
    return new Promise((res, rej) => {
      if (!user.id) return rej(new NoInputDataError({ id: user.id }));

      tOrmCon.then((connection) => {
        connection
          .getRepository("Admin")
          .update({ id }, user)
          .then((data) => res(data))
          .catch((error) => rej(new MySqlError(error)));
      });
    });
  }
}

module.exports = new UsersService();
