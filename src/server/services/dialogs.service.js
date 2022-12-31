const tOrmCon = require("../../db/connection");
const checkInputData = require("../utils/checkInputData");
const {
  HttpError,
  MySqlError,
  NotFoundError,
  NoInputDataError,
} = require("../utils/httpErrors");

class UsersService {
  constructor() {
    this.getOne = this.getOne.bind(this);

    this.getAll = this.getAll.bind(this);
  }

  getOne(id) {
    return new Promise(async (res, rej) => {
      const connection = await tOrmCon;

      connection
        .query(
          `select d.*, u.username from dialogs d left join users u on d.client_id = u.id where d.id = $1`,
          [id]
        )
        .then(async (postData) => {
          if (!postData?.[0]) rej(new NotFoundError());

          return res(postData?.[0]);
        })
        .catch((error) => rej(new MySqlError(error)));
    });
  }

  getAll({ id, page = 1, take = 10, appointment_id, usernameQuery }) {
    return new Promise(async (res, rej) => {
      if (id) {
        this.getOne(id)
          .then((data) => res(data))
          .catch((error) => rej(error));
      }

      const skip = (page - 1) * take;
      appointment_id = appointment_id || null;
      usernameQuery = usernameQuery ? `%${usernameQuery}%` : null;

      const connection = await tOrmCon;

      connection
        .query(
          `select d.*, u.username, u2.username username2 from dialogs d 
          left join appointments a on d.appointment_id = a.id 
          left join users u on d.client_id = u.id
          left join users u2 on a.customer_id = u2.id
          where (appointment_id = $1) or 
          ((lower(u.username) like lower($2) or lower(u2.username) like lower($2))) or 
          ($1 is NULL and $2 is NULL)
          order by d.id DESC
          LIMIT $3 OFFSET $4`,
          [appointment_id, usernameQuery, take, skip]
        )
        .then((data) => res(data))
        .catch((error) => rej(new MySqlError(error)));
    });
  }
}

module.exports = new UsersService();
