const tOrmCon = require("../../db/connection");
const checkInputData = require("../utils/checkInputData");
const sendToOpposite = require("../../Utils/sendToOpposite");

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
          `select m.*, u.username from messages m left join users u on m.from_id = u.id where m.id = $1`,
          [id]
        )
        .then(async (postData) => {
          if (!postData?.[0]) rej(new NotFoundError());

          return res(postData?.[0]);
        })
        .catch((error) => rej(new MySqlError(error)));
    });
  }

  getAll({ id, page = 1, take = 100, dialog_id }, ctx) {
    return new Promise(async (res, rej) => {
      if (id) {
        this.getOne(id)
          .then((data) => res(data))
          .catch((error) => rej(error));
      }

      const skip = (page - 1) * take;
      dialog_id = dialog_id || null;

      const connection = await tOrmCon;

      connection
        .query(
          `select m.*, u.username from messages m left join users u on m.from_id = u.id
          where dialog_id = $1 or $1 is null
          order by id desc
          LIMIT $2 OFFSET $3`,
          [dialog_id, take, skip]
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

  addOne({ dialog_id, text, photo, video, voice, file, video_note }, ctx) {
    return new Promise(async (res, rej) => {
      const connection = await tOrmCon;

      const {
        opened_client,
        opened_seller,
        appointment_id,
        client_id,
        seller_id,
      } =
        (
          await connection
            .query(
              `select opened_client, opened_seller, appointment_id, client_id, customer_id seller_id 
            from dialogs d left join appointments a on d.appointment_id = a.id where d.id = $1`,
              [dialog_id]
            )
            .catch((e) => {
              console.log(e);
              ctx.replyWithTitle("DB_ERROR");
            })
        )?.[0] ?? {};

      const message = await sendToOpposite(ctx, client_id, opened_client, {
        text,
        photo,
        video,
        voice,
        file,
        video_note,
        dialog_id,
        appointment_id,
        toClient: true,
        from: "admin",
      });

      const second = await sendToOpposite(ctx, seller_id, opened_seller, {
        text,
        photo,
        video,
        voice,
        file,
        video_note,
        dialog_id,
        from: "admin",
      });

      await connection
        .query(
          `insert into messages (id, second_id, dialog_id,from_id,text, photo, video, voice,file, video_note, from_admin) 
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            message?.message_id,
            second?.message_id,
            dialog_id,
            null,
            text,
            photo,
            video,
            voice,
            file,
            video_note,
            true,
          ]
        )
        .then((data) => res(data))
        .catch((error) => rej(new MySqlError(error)));
    });
  }
}

module.exports = new UsersService();
