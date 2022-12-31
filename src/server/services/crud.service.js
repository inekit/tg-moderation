const tOrmCon = require("../../db/connection");
const checkInputData = require("../utils/checkInputData");
const {
  HttpError,
  MySqlError,
  NotFoundError,
  NoInputDataError,
} = require("../utils/httpErrors");

class CustomServiceWrapper {
  constructor() {
    (this.tableNames = []), (this.services = {});
    tOrmCon.then((conn) => {
      conn.entityMetadatas.forEach((md) => {
        this.tableNames.push(md.name);
      });
    });
  }

  getService(name, fields) {
    //if (!this.tableNames.includes(name)) return;
    return {
      get: this.getGetter(name),
      add: this.getAdder(name, fields), //'password', 'nick', 'email'
      delete: this.getDeleter(name),
      edit: this.getEditer(name, fields),
    };
  }

  getGetter(name) {
    return (id, page, take, addFilters, relations) => {
      return new Promise((res, rej) => {
        const filteres = addFilters ?? {};
        if (id) filteres.toCode = id;

        take = take || 10;
        page = page || 1;
        let skip = (page - 1) * take;

        tOrmCon.then((connection) => {
          connection
            .getRepository(name)
            .find({ where: filteres, skip, take, relations })
            .then((data) => res(data))
            .catch((error) => rej(new MySqlError(error)));
        });
      });
    };
  }

  getAdder(name, fields) {
    return (params) => {
      return new Promise((res, rej) => {
        if (!checkInputData(params, ...fields))
          return rej(new NoInputDataError(params));
        tOrmCon.then((connection) => {
          connection
            .getRepository({ name })
            .save(params)
            .then((data) => res(data))
            .catch((error) => rej(new MySqlError(error)));
        });
      });
    };
  }

  getDeleter(name) {
    return (findTag, findByField = "id") => {
      return new Promise((res, rej) => {
        if (!findTag)
          return rej(new NoInputDataError({ [findByField]: findTag }));

        tOrmCon.then((connection) => {
          connection
            .getRepository(name)
            .delete({ [findByField]: findTag })
            .then((data) => res(data))
            .catch((error) => rej(new MySqlError(error)));
        });
      });
    };
  }

  getEditer(name, fields) {
    return (params) => {
      return new Promise((res, rej) => {
        if (!params?.id) return rej(new NoInputDataError(params));

        //if (!checkInputData(user, ...fields)) return rej("no data");
        for (let i in params) {
          if (!params[i]) delete params[i];
        }

        tOrmCon.then((connection) => {
          connection
            .getRepository(name)
            .createQueryBuilder()
            .update(params)
            .where({
              id: params.id,
            })
            .returning("*")
            .execute()
            .then((data) => res(data))
            .catch((error) => rej(new MySqlError(error)));
        });
      });
    };
  }
}

module.exports = new CustomServiceWrapper();
