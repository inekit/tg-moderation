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

const scene = new CustomWizardScene("dialogScene").enter(async (ctx) => {
  const {
    visual = true,
    appointment_id,
    mode,
    from_dialogs,
    searchResultParams,
  } = ctx.scene.state;

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
       where appointment_id = $1
    and d.client_id = $2`,
      [appointment_id, ctx.from.id]
    )
    .catch(console.log);

  console.log(1111, messages);

  let dialog_id = messages?.[0]?.dialog_id;

  if (!dialog_id)
    dialog_id = (
      await connection
        .query(
          `insert into dialogs (client_id, appointment_id, opened_client) values($1, $2, true) returning id`,
          [ctx.from.id, appointment_id]
        )
        .catch((e) => {})
    )?.[0]?.id;
  else
    await connection
      .query(`update dialogs set opened_client = true where id = $1`, [
        dialog_id,
      ])
      .catch((e) => {});

  ctx.scene.state.dialog_id = dialog_id;

  const t_data = (
    await connection
      .query(
        `select customer_id seller_id, username seller_username, a.*
        from appointments a left join users u on a.customer_id = u.id where a.id = $1 limit 1`,
        [appointment_id]
      )
      .catch((e) => {})
  )?.[0];

  const { seller_id, seller_username } = t_data;

  ctx.scene.state.seller_id = seller_id;
  ctx.scene.state.seller_username = seller_username;
  ctx.scene.state.messages = messages;

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
        `${message.text} ${botCommand}`,
      ]);
    })
    ?.join("\n\n");

  let messages_ids = [];

  messages[0]?.username &&
    messages_ids.push(
      (await ctx.telegram.sendMessage(ctx.chat.id, messagesStr))?.message_id
    );

  const title = await require("../Utils/titleFromDataObj")(
    t_data,
    "ENTER_FINISH",
    ctx
  );

  messages_ids.push(
    (await ctx.replyWithKeyboard(title, "dialog_keyboard"))?.message_id
  );

  ctx.scene.state.messages_ids = messages_ids;

  console.log(messages_ids, dialog_id, seller_id, seller_username);
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

scene.hears(titles.getValues("BUTTON_BACK"), async (ctx) => {
  const connection = await tOrmCon;

  const {
    dialog_id,
    from_dialogs,
    messages_ids,
    seller_id,
    seller_username,
    appointment_id,
    searchResultParams,
  } = ctx.scene.state;

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
    .query(`update dialogs set opened_client = false where id = $1`, [
      dialog_id,
    ])
    .catch((e) => {});

  await ctx.telegram.sendMessage(
    seller_id,
    `@${ctx.from.username} (№${appointment_id}) покинул диалог`
  );

  if (searchResultParams)
    return ctx.scene.enter("searchResultScene", {
      edit: false,
      ...searchResultParams,
    });
  ctx.scene.enter("clientScene", { from_dialogs });
});

scene.on(
  ["document", "photo", "video", "voice", "video_note", "file", "text"],
  async (ctx) => {
    ctx.scene.state.messages_ids &&
      ctx.scene.state.messages_ids.push(ctx.message.message_id);

    const text = ctx.message.text ?? ctx.message.caption;
    const photo = ctx.message.photo?.[2].file_id;
    const file = ctx.message.document?.file_id;
    const video = ctx.message.video?.file_id;
    const voice = ctx.message.voice?.file_id;
    const video_note = ctx.message.video_note?.file_id;

    console.log(text, photo, video, voice, video_note);

    const { dialog_id, seller_id, seller_username, appointment_id } =
      ctx.scene.state;

    const connection = await tOrmCon;

    const { opened_admin_id, opened_seller } =
      (
        await connection
          .query(
            "select opened_seller, opened_admin_id from dialogs where id = $1",
            [dialog_id]
          )
          .catch((e) => {
            console.log(e);
            ctx.replyWithTitle("DB_ERROR");
          })
      )?.[0] ?? {};

    const message = await sendToOpposite(ctx, seller_id, opened_seller, {
      text,
      photo,
      video,
      voice,
      file,
      video_note,
      dialog_id,
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

    console.log(opened_admin_id, second);

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
        io.emit("DIALOG_MESSAGE", {
          id: message?.message_id,
          second_id: second?.message_id,
          dialog_id,
          from_id: ctx.from.id,
          text,
          username: ctx.from.username,
          photo: (await ctx.telegram.getFileLink(photo).catch(() => {}))?.href,
          video,
          voice,
          file,
          video_note,
        });
      })
      .catch((e) => {
        console.log(e);
        ctx.replyWithTitle("DB_ERROR");
      });
  }
);

module.exports = scene;
