const tOrmCon = require("../db/connection");
const { Markup } = require("telegraf");

const callbackButton = Markup.button.callback;
const urlButton = Markup.button.url;
module.exports = async (id, ctx) => {
  const connection = await tOrmCon;

  const appointmentObj = await connection
    .query(
      `select wa.*, u.username from appointments wa 
        left join users u on wa.customer_id = u.id 
        where wa.id = $1 order by datetime_created limit 1`,
      [id]
    )
    .catch((e) => {
      console.log(e);
    });

  if (!appointmentObj?.length) return;

  const {
    what_need,
    name,
    contacts,
    send_from,
    send_to,
    departure_date,
    departure_date_back,
    comment_delivery,
    comment,
    customer_id,
    description,
  } = appointmentObj?.[0];

  io.emit("NEW_APPOINTMENT");

  const title =
    what_need === "send"
      ? ctx.getTitle("ENTER_FINISH_SEND_PUBLIC", [
          id,
          name,
          send_from,
          send_to,
          description,
          comment ? `\n${comment}` : " ",
        ])
      : ctx.getTitle("ENTER_FINISH_DELIVERY_PUBLIC", [
          id,
          name,
          send_from,
          send_to,
          departure_date_back ? "и обратно" : " ",
          departure_date,
          departure_date_back ? ` 🛬 ${departure_date_back}` : " ",
          comment ? `\n4) ${comment}` : " ",
        ]);

  await ctx.telegram //process.env.CHANNEL_ID
    .sendMessage(process.env.CHANNEL_ID, title, {
      reply_markup: {
        inline_keyboard: [
          [
            urlButton(
              ctx.getTitle("SEND_DIALOG_REQUEST"),
              `t.me/${
                ctx.botInfo?.username ?? (await ctx.botName())
              }/?start=dialog-${id}`
            ),
          ],
        ],
      },
    });

  await ctx.telegram
    .sendMessage(customer_id, ctx.getTitle("APPOINTMENT_APROOVED", [id]))
    .catch((e) => {});
};
