const e = require("express");
const {
  CustomWizardScene,
  createKeyboard,
  handlers: { FilesHandler },
  telegraf: { Markup },
} = require("telegraf-steps");
const tOrmCon = require("../db/connection");
const getUser = require("../Utils/getUser");

const scene = new CustomWizardScene("dialogScene").enter(async (ctx) => {
  const { visual = true, appointment_id, mode } = ctx.scene.state;
  let userObj = (ctx.scene.state.userObj = await getUser(ctx));

  const connection = await tOrmCon;

  const messages = await connection
    .query(
      `select m.*, d.id dialog_id from messages m right join dialogs d on m.dialog_id = d.id where appointment_id = $1
    and d.client_id = $2`,
      [appointment_id, ctx.from.id]
    )
    .catch(console.log);

  let dialog_id = messages?.[0]?.[dialog_id];

  if (!dialog_id)
    dialog_id = (
      await connection
        .query(
          `insert into dialogs (client_id, appointment_id) values($1, $2) returning id`,
          [ctx.from.id, appointment_id]
        )
        .catch((e) => {})
    )?.[0]?.id;

  ctx.scene.state.dialog_id = dialog_id;

  const { seller_id, seller_username } = (
    await connection
      .query(
        `select customer_id seller_id, username seller_username 
        from appointments a left join users u on a.customer_id = u.id where id = $1 limit 1`,
        [appointment_id]
      )
      .catch((e) => {})
  )?.[0];

  ctx.scene.state.seller_id = seller_id;
  ctx.scene.state.seller_username = seller_username;

  console.log(messages, dialog_id, seller_id, seller_username);

  await ctx.replyWithTitle("DIALOG_STARTED");
});

scene.on("message", async (ctx) => {
  const text = ctx.message.text;
  const photo = ctx.message.photo?.file_id;
  const video = ctx.message.video?.file_id;
  const voice = ctx.message.voice?.file_id;
  const video_note = ctx.message.video_note?.file_id;

  console.log(text, photo, video, voice, video_note);

  const { dialog_id, seller_id, seller_username, appointment_id } =
    ctx.scene.state;

  const connection = await tOrmCon;

  await connection
    .query(
      "insert into messages (dialog_id,from_id,text, photo, video, voice, video_note) values ($1,$2,$3,$4,$5,$6,$7)",
      [dialog_id, ctx.from.id, text, photo, video, voice, video_note]
    )
    .then((res) => {
      ctx.sendMessage(seller_id, text);
    })
    .catch((e) => {
      console.log(e);
      ctx.replyWithTitle("DB_ERROR");
    });
});

module.exports = scene;
