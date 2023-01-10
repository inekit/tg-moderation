const tOrmCon = require("../../db/connection");
const { getUsers, deleteUser } = require("../services/users.service");
const {
  HttpError,
  MySqlError,
  NotFoundError,
  NoInputDataError,
} = require("../utils/httpErrors");

function getId(req, res) {
  myId = req.session.passport.user.toString();

  tOrmCon.then(async (connection) => {
    const users = await connection
      .getRepository("Admin")
      .find({ where: [{ id: myId }], select: ["id", "user_id"] })
      .catch((error) => next(new MySqlError(error)));

    console.log(1, users);
    users?.[0] ? res.status(200).send(users?.[0]) : next(new MySqlError(error));
  });
}

function getAll(req, res) {
  getUsers(req.query.id, req.query.page, req.query.take)
    .then((userData) => res.status(200).send(userData))
    .catch((err) =>
      res.status(404).send({ error: "Не удается найти пользователя" })
    );
}

function selfDelete(req, res) {
  const id = req.session.passport.user.toString();
  deleteUser(id)
    .then((userData) => res.status(200).send({ status: true }))
    .catch((err) =>
      res
        .status(304)
        .send({ status: false, error: "Не удается удалить пользователя" })
    );
}

function adminDelete(req, res) {
  const id = req.body.id;
  deleteUser(id)
    .then((userData) => res.status(200).send({ status: true }))
    .catch((err) => res.status(304).send({ status: false, error: err }));
}

module.exports = {
  getId,
  getAll,
  selfDelete,
  adminDelete,
};
