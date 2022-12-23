const e = require("express");
const {
  CustomWizardScene,
  createKeyboard,
  handlers: { FilesHandler },
  telegraf: { Markup },
} = require("telegraf-steps");
const tOrmCon = require("../db/connection");
const getUser = require("../Utils/getUser");
const sendToOpposite = require("../Utils/sendToOpposite");

const scene = new CustomWizardScene("dialogSellerScene").enter(async (ctx) => {
  const { visual = true, dialog_id, from_dialogs } = ctx.scene.state;
  let userObj = (ctx.scene.state.userObj = await getUser(ctx));

  const connection = await tOrmCon;

  await connection
    .query(
      `update dialogs set opened_admin_id = null where opened_admin_id = $1`,
      [ctx.from.id]
    )
    .catch((e) => {});

  const messages = await connection
    .query(
      `select m.*, d.id dialog_id, username from messages m 
      right join dialogs d on m.dialog_id = d.id 
      left join users u on m.from_id = u.id
      where dialog_id = $1 order by m.id`,
      [dialog_id]
    )
    .catch(console.log);

  await connection
    .query(`update dialogs set opened_seller = true where id = $1`, [dialog_id])
    .catch((e) => {});

  const {
    client_id,
    client_username,
    appointment_id,
    what_need,
    name,
    contacts,
    send_from,
    send_to,
    departure_date,
    departure_date_back,
    comment,
    description,
  } = (ctx.scene.state.item = (
    await connection
      .query(
        `select client_id, username client_username, a.* ,d.appointment_id
        from dialogs d 
        left join users u on d.client_id = u.id 
        left join appointments a on d.appointment_id = a.id
        where d.id = $1 limit 1`,
        [dialog_id]
      )
      .catch((e) => {})
  )?.[0]);

  ctx.scene.state.client_id = client_id;
  ctx.scene.state.client_username = client_username;
  ctx.scene.state.appointment_id = appointment_id;
  ctx.scene.state.messages = messages;
  console.log("fwe", ctx.scene.state.appointment_id);

  const messagesStr = messages
    ?.map((message) => {
      const { photo, video, file, voice, video_note, from_admin } = message;
      let command = photo
        ? "/photo"
        : video
        ? "/video"
        : file
        ? "/document"
        : voice
        ? "/voice"
        : video_note
        ? "/video_note"
        : "";
      const botCommand = command ? command + message.id : "";

      const author = from_admin
        ? "@admin"
        : message.username
        ? "@" + message.username
        : message.from_id;

      return ctx.getTitle("DIALOG_MESSAGE", [
        author,
        `${message.text ? message.text + " " : ""}${botCommand}`,
      ]);
    })
    ?.join("\n\n");

  let messages_ids = [];

  /*for (message of messages) {
    messages_ids.push(
      (
        await ctx.replyWithTitle(
          "DIALOG_MESSAGE",
          [
            message.username ? "@" + message.username : message.from_id,
            message.text,
          ],
          { disable_notification: true }
        )
      )?.message_id
    );
  }*/

  messages_ids.push(
    (await ctx.telegram.sendMessage(ctx.chat.id, messagesStr))?.message_id
  );

  const title =
    what_need === "send"
      ? ctx.getTitle("ENTER_FINISH_SEND", [
          name,
          send_from,
          send_to,
          description,
          contacts,
          comment ? `\n${comment}` : " ",
        ])
      : ctx.getTitle("ENTER_FINISH_DELIVERY", [
          name,
          send_from,
          send_to,
          departure_date_back ? "и обратно" : " ",
          departure_date,
          departure_date_back ? ` 🛬 ${departure_date_back}` : " ",
          contacts,
          comment ? `\n5) ${comment}` : " ",
        ]);

  messages_ids.push(
    (await ctx.replyWithKeyboard(title, "dialog_keyboard"))?.message_id
  );

  ctx.scene.state.messages_ids = messages_ids;
});

scene.hears(titles.getValues("BUTTON_BACK"), async (ctx) => {
  const connection = await tOrmCon;

  const { dialog_id, from_dialogs, messages_ids, client_id, appointment_id } =
    ctx.scene.state;

  for (id of messages_ids) {
    ctx.telegram.deleteMessage(ctx.chat.id, id).catch((e) => {
      //console.log(e);
    });
  }

  const messages = await connection
    .query(
      `select m.*, d.id dialog_id, username from messages m 
      right join dialogs d on m.dialog_id = d.id 
      left join users u on m.from_id = u.id
      where dialog_id = $1 order by m.id`,
      [dialog_id]
    )
    .catch(console.log);

  for (message of messages) {
    if (message.id > messages_ids[0])
      ctx.telegram.deleteMessage(ctx.chat.id, message.id).catch((e) => {
        console.log(e);
      });

    message.second_id &&
      ctx.telegram.deleteMessage(ctx.chat.id, message.second_id).catch((e) => {
        console.log(e);
      });
  }

  await connection
    .query(`update dialogs set opened_seller = false where id = $1`, [
      dialog_id,
    ])
    .catch((e) => {});

  await ctx.telegram.sendMessage(
    client_id,
    `@${ctx.from.username} (№${appointment_id}) покинул диалог`
  );

  ctx.scene.enter("clientScene", { from_dialogs });
});

scene.hears(
  /\/(photo|video|document|voice|video_note)([0-9]+)/g,
  async (ctx) => {
    const command = ctx.match[1];
    const message_id = ctx.match[2];

    const message = ctx.scene.state.messages.find((el) => el.id == message_id);

    console.log(message);
    const { text, photo, video, voice, file, video_note, dialog_id } = message;

    await sendToOpposite(
      ctx,
      ctx.from.id,
      true,
      {
        text,
        photo,
        video,
        voice,
        file,
        video_note,
        dialog_id,
      },
      true
    );
  }
);

scene.on(
  ["document", "photo", "video", "voice", "video_note", "file", "text"],
  async (ctx) => {
    ctx.scene.state.messages_ids &&
      ctx.scene.state.messages_ids.push(ctx.message.message_id);

    const text = ctx.message.text ?? ctx.message.caption;
    const photo = ctx.message.photo?.[1].file_id;
    const file = ctx.message.document?.file_id;

    const video = ctx.message.video?.file_id;
    const voice = ctx.message.voice?.file_id;
    const video_note = ctx.message.video_note?.file_id;

    const { dialog_id, client_id, seller_username, appointment_id } =
      ctx.scene.state;

    const connection = await tOrmCon;

    const { opened_client, opened_admin_id } =
      (
        await connection
          .query(
            "select opened_client, opened_admin_id from dialogs where id = $1",
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
    });

    const second =
      opened_admin_id &&
      (await sendToOpposite(ctx, opened_admin_id, true, {
        text,
        photo,
        video,
        voice,
        file,
        video_note,
        dialog_id,
      }));

    await connection
      .query(
        "insert into messages (id, second_id, dialog_id,from_id,text, photo, video, voice,file, video_note) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [
          message?.message_id,
          second?.message_id,
          dialog_id,
          ctx.from.id,
          text,
          photo,
          video,
          voice,
          file,
          video_note,
        ]
      )
      .then(async (res) => {
        console.log(123, appointment_id);
      })
      .catch((e) => {
        console.log(e);
        ctx.replyWithTitle("DB_ERROR");
      });
  }
);

module.exports = scene;
