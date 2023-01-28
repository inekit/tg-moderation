const {
  Telegraf,
  Scenes: { Stage },
  Composer,
} = require("telegraf");
const titles = require("telegraf-steps").titlesGetter(__dirname + "/Titles");
const getUser = require("./Utils/getUser");
const tOrmCon = require("./db/connection");

const mainStage = new Stage(
  [
    ...require("./scenes/mainScene"),
    require("./scenes/dialogScene"),
    require("./scenes/dialogSellerScene"),
    require("./scenes/userAppointmentsScene"),
    require("./scenes/searchResultScene"),
    require("./scenes/subscriptionsScene"),
    require("./scenes/searchScene"),

    require("./scenes/adminScenes/adminScene"),
    require("./scenes/adminScenes/adminsScene"),
    require("./scenes/adminScenes/appointmentsScene"),
    require("./scenes/adminScenes/historyScene"),
    require("./scenes/adminScenes/searchDialogScene"),
    require("./scenes/adminScenes/dialogAdminScene"),
    require("./scenes/adminScenes/changePasswordScene"),
    require("./scenes/adminScenes/changeRightsScene"),
  ],
  {
    default: "clientScene",
  }
);

mainStage.use(async (ctx, next) => {
  const user = await getUser(ctx);

  if (user.status === "restricted")
    return ctx.replyWithKeyboard("YOU_ARE_RESTRICTED", "remove_keyboard");

  return next();
});

mainStage.start(async (ctx) => ctx.scene.enter("clientScene"));

mainStage.action(/^(d|s)\-(.+)\-(.+)\-(.+)\-(.+)/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  let [full_str, what_need, send_from, send_to, date_start, date_finish] =
    ctx.match;

  console.log(ctx.match);

  what_need = what_need === "d" ? "delivery" : "send";

  send_from = send_from !== "undefined" ? send_from : null;
  send_to = send_to !== "undefined" ? send_to : null;
  date_start = date_start !== "undefined" ? date_start + "00" : null;
  date_finish = date_finish !== "undefined" ? date_finish + "00" : null;

  ctx.scene.enter("searchResultScene", {
    what_need,
    send_from,
    send_to,
    date_start,
    date_finish,
  });
});

mainStage.action(/^softmain\-dialog\-([0-9]+)$/g, async (ctx) => {
  const appointment_id = ctx.match[1];

  const connection = await tOrmCon;

  const opened_client = (
    await connection
      .query(
        `select opened_client from dialogs where client_id = $1 and appointment_id = $2`,
        [ctx.from.id, appointment_id]
      )
      .catch((e) => {})
  )?.[0]?.opened_client;

  console.log(1213, opened_client);

  if (opened_client)
    return await ctx.answerCbQuery("Диалог уже открыт").catch(console.log);
  await ctx.answerCbQuery().catch(console.log);

  ctx.scene.enter("dialogScene", {
    appointment_id,
    mode: "client",
  });
});

mainStage.action(/^dialog\-([0-9]+)$/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  ctx.scene.enter("dialogSellerScene", { dialog_id: ctx.match[1] });
});
mainStage.action(/^dialog\-client\-([0-9]+)$/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);
  console.log(224);

  ctx.scene.enter("dialogScene", { appointment_id: ctx.match[1] });
});

mainStage.hears(titles.getValues("BUTTON_BACK_USER"), (ctx) =>
  ctx.scene.enter("clientScene")
);
mainStage.hears(titles.getValues("BUTTON_CLIENT_MENU"), (ctx) =>
  ctx.scene.enter("clientScene")
);

const adminStage = new Stage([
  //require("./scenes/adminScenes/adminScene"),
  // require("./scenes/adminScenes/adminsScene"),
  //require("./scenes/adminScenes/adsLinkScene"),
  //require("./scenes/adminScenes/claimsScene"),
  //require("./scenes/adminScenes/confirmCertificate"),
]);

mainStage.hears(titles.getValues("BUTTON_BACK_ADMIN"), (ctx) => {
  console.log(1);
  ctx.scene.enter("adminScene");
});

adminStage.hears(
  titles.getValues("BUTTON_ADMIN_MENU"),
  (ctx) =>
    store.isAdmin(ctx?.from?.id) &&
    ctx.scene.enter("adminScene", { edit: true })
);

const stages = new Composer();

stages.use(Telegraf.chatType("private", mainStage.middleware()));
stages.use(Telegraf.chatType("private", adminStage.middleware()));

module.exports = stages;
