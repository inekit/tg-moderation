const {
  CustomWizardScene,
  telegraf: { Composer, Markup },
  handlers: { FilesHandler },
} = require("telegraf-steps");
const tOrmCon = require("../db/connection");
const moment = require("moment");

const scene = new CustomWizardScene("searchScene").enter(async (ctx) => {
  const { edit } = ctx.scene.state;

  const connection = await tOrmCon;

  const hasSubscriptions = !!(
    await connection
      .query(`select * from subscriptions where client_id = $1 limit 1`, [
        ctx.from.id,
      ])
      .catch((e) => {
        console.log(e);
      })
  )?.[0];

  const title = "CHOOSE_FILTERS_TITLE";
  const keyboard = {
    name: "filters_keyboard",
    args: [ctx.from.id, hasSubscriptions],
  };

  if (edit) return ctx.editMenu(title, keyboard);

  await ctx.replyWithKeyboard("⚙️", "main_menu_back_keyboard");
  ctx.replyWithKeyboard(title, keyboard);
});

scene.action("subscriptions", async (ctx) => {
  await ctx.answerCbQuery().catch((e) => {});
  ctx.scene.enter("subscriptionsScene", { edit: true });
});

scene.action("go_back", (ctx) => {
  ctx.answerCbQuery().catch(console.log);

  ctx.scene.enter("mainScene", {
    edit: true,
  });
});

module.exports = scene;
