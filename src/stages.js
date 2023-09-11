const {
  Telegraf,
  Scenes: { Stage },
  Composer,
} = require("telegraf");
const titles = require("telegraf-steps").titlesGetter(__dirname + "/Titles");
const tOrmCon = require("./db/connection");
const getUser = require("./Utils/getUser");

const mainStage = new Stage(
  [
    require("./scenes/adminScenes/adminScene"),
    require("./scenes/adminScenes/adminsScene"),
    require("./scenes/adminScenes/whiteListScene"),
  ],
  {
    default: "clientScene",
  }
);

mainStage.start(async (ctx) => {
  const connection = await tOrmCon;

  const adminInfo = (
    await connection
      .query(`select * from admins where user_id = $1 limit 1`, [ctx.from.id])
      .catch(console.log)
  )?.[0];

  if (!adminInfo) return;
  ctx.scene.enter("adminScene");
});

mainStage.use(async (ctx, next) => {
  const adminScenesNames = ["adminScene", "adminsScene", "whiteListScene"];

  if (
    (adminScenesNames.includes(ctx.session?.__scenes.current) ||
      ctx.message?.text === ctx.getTitle("BUTTON_BACK_ADMIN")) &&
    !(await getUser(ctx))?.user_id &&
    ctx.message?.text !== "/start"
  ) {
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch((e) => {});

    return ctx.replyWithTitle("YOU_ARE_NOT_ADMIN");
  }

  return await next();
});

mainStage.hears(titles.getValues("BUTTON_BACK_ADMIN"), (ctx) => {
  console.log(1);
  ctx.scene.enter("adminScene");
});

mainStage.hears(titles.getValues("BUTTON_ADMIN_MENU"), (ctx) =>
  ctx.scene.enter("adminScene", { edit: true })
);

const chatStage = new Stage([]);

chatStage.on("message", async (ctx) => {
  const user_id = ctx.from.id;
  const chat_id = ctx.chat.id;

  const botInfo = await ctx.getChatMember(ctx.botInfo.id);

  if (
    botInfo.status !== "administrator" ||
    botInfo.can_delete_messages === false
  )
    return;

  const connection = await tOrmCon;
  const queryRunner = connection.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  console.log(Date.now().toLocaleString(), ctx.message.message_id);
  try {
    const wlInfo = (
      await connection.query(
        `select * from white_list wl
      where wl.id = $1 limit 1`,
        [user_id]
      )
    )?.[0];

    const userInfo = (
      await connection.query(
        `select *, DATE_PART('hour', now() - last_message_datetime)::int hours_ago from white_list wl
      left join chat_abilities ca on ca.user_id = wl.id
      where wl.id = $1 and (ca.chat_id = $2 or ca.chat_id is null) limit 1`,
        [user_id, chat_id]
      )
    )?.[0];

    console.log(
      ctx.message.message_id,
      user_id,
      chat_id,
      "is user",
      userInfo,
      userInfo?.hours_ago !== null && userInfo?.hours_ago < 8,
      ctx.message.text
    );

    let alert_id;
    if (!wlInfo) {
      await ctx.deleteMessage(ctx.message.message_id).catch(console.log);
      alert_id = (await ctx.replyWithTitle("CONNECT_TO_ADMIN"))?.message_id;
    } else {
      if (userInfo?.hours_ago !== null && userInfo?.hours_ago < 8) {
        await ctx.deleteMessage(ctx.message.message_id).catch(console.log);
        alert_id = (
          await ctx.replyWithTitle("TOO_FAST_MESSAGING", [
            8 - userInfo.hours_ago,
          ])
        )?.message_id;
      } else
        await connection.query(
          `INSERT INTO chat_abilities (user_id, chat_id, last_message_datetime)
        VALUES($1,$2,now()) 
        ON CONFLICT (user_id, chat_id) 
        DO 
           UPDATE SET last_message_datetime = now()`,
          [user_id, chat_id]
        );

      await connection.query(
        `update white_list set username = $1 where id=$2`,
        [ctx.from.username, user_id]
      );
    }

    alert_id &&
      setTimeout(() => {
        ctx.deleteMessage(alert_id).catch(console.log);
      }, 10000);

    await queryRunner.commitTransaction();
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.log(err);
  } finally {
    await queryRunner.release();
  }
});

const stages = new Composer();

stages.use(Telegraf.chatType("private", mainStage.middleware()));
stages.use(Telegraf.chatType(["group", "supergroup"], chatStage.middleware()));

module.exports = stages;
