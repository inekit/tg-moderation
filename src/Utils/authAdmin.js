const tOrmCon = require("../db/connection");

module.exports = (tgId, can_update_admins) =>
  new Promise(async (resolve, reject) => {
    if (!tgId) throw new Error("no tg id");
    const connection = await tOrmCon;
    connection
      .getRepository("Admin")
      .findOne({ where: { user_id: tgId, can_update_admins } })
      .then((res) => {
        //console.log(res);
        if (res) return resolve(res, connection);
        reject("NO_SUCH_ADMIN");
      })
      .catch((e) => {
        console.log(e);
        reject("DB_ERROR");
      });
  });
