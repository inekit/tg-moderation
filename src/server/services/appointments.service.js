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
          `select a.*, u.username from appointments a left join users u on a.customer_id = u.id where a.id = $1`,
          [id]
        )
        .then(async (postData) => {
          //if (!postData?.[0]) rej(new NotFoundError());

          return res(postData);
        })
        .catch((error) => rej(new MySqlError(error)));
    });
  }

  getAll(
    {
      id,
      page = 1,
      take = 10,
      searchQuery,
      send_from,
      send_to,
      usernameQuery,
      status,
    },
    ctx
  ) {
    return new Promise(async (res, rej) => {
      if (id) {
        this.getOne(id)
          .then((data) => res(data))
          .catch((error) => rej(error));
      }

      const skip = (page - 1) * take;
      searchQuery = searchQuery ? `%${searchQuery}%` : null;
      send_from = send_from || null;
      send_to = send_to || null;
      status = status || null;
      usernameQuery = usernameQuery ? `%${usernameQuery}%` : null;

      const connection = await tOrmCon;

      connection
        .query(
          `select a.*, u.username from appointments a left join users u on a.customer_id = u.id
            where ((lower(comment) like lower($1) or $1 is NULL) or (lower(description) like lower($1) or $1 is NULL))
              and (send_from = $2 or $2 is NULL)  
              and (send_to = $3 or $3 is NULL)  
              and (a.status = $4 or $4 is NULL)  
              and (lower(username) like lower($5) or $5 is NULL)
              order by a.datetime_created DESC
              LIMIT $6 OFFSET $7`,
          [searchQuery, send_from, send_to, status, usernameQuery, take, skip]
        )
        .then(async (data) => {
          for (let d of data) {
            if (d.photo)
              d.photo = (
                await ctx.telegram.getFileLink(d.photo).catch(() => {})
              )?.href;
          }
          return res(data);
        })
        .catch((error) => rej(new MySqlError(error)));
    });
  }

  transformTagsArray(tagsArray) {
    let tagObjs;
    if (typeof tagsArray === "object") {
      tagObjs = tagsArray?.map((name) => {
        return {
          name,
        };
      });
    } else if (typeof tagsArray === "string") {
      tagObjs = [{ name: tagsArray }];
    } else tagObjs = [];

    return tagObjs;
  }
}

module.exports = new UsersService();
