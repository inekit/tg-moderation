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

  const { customer_id } = appointmentObj?.[0];

  const a_count = (
    await connection
      .query(
        "select count(*) a_count from appointments where status = 'aprooved' and customer_id = $1",
        [customer_id]
      )
      .catch((e) => {
        console.log(e);
      })
  )?.[0]?.a_count;

  const status = (
    await queryRunner
      .query("select status from users where id = $1 limit 1", [customer_id])
      .catch((e) => {
        console.log(e);
      })
  )?.[0]?.status;

  if (status !== "reliable")
    await queryRunner.query("update users set status = $1 where id = $2", [
      a_count >= 5 ? "regular" : a_count >= 1 ? "user" : "newbie",
      customer_id,
    ]);

  io.emit("NEW_APPOINTMENT");

  const title = await require("./titleFromDataObj")(
    appointmentObj?.[0],
    "ENTER_FINISH_PUBLIC",
    ctx
  );

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
