const {
  Composer,
  Scenes: { BaseScene },
} = require("telegraf");
const tOrmCon = require("../../db/connection");
const authAdmin = require("../../Utils/authAdmin");
const bcrypt = require("bcryptjs");
const salt = process.env.SALT;
const scene = new BaseScene("changePasswordScene");

scene.enter(async (ctx) => {
  const { edit, main_menu_button } = ctx.scene.state;
  const res = await authAdmin(ctx.from.id, true).catch(() => {
    return ctx.scene.enter("clientScene");
  });
  if (!res) {
    return ctx.scene.enter("clientScene");
  }

  const connection = await tOrmCon;
  const admin = (
    await connection
      .query(
        `select a.user_id, a.password, a.can_update_admins 
         from admins a
         where a.user_id = $1`,
        [ctx.from.id]
      )
      .catch((e) => {
        console.log(e);
        ctx.answerCbQuery("DB_ERROR");
      })
  )?.[0];

  const keyboard = "password_actions_keyboard";
  const title = ctx.getTitle("ADMIN_PASSWORD_TITLE", [
    "https://92.255.79.59/",
    admin.user_id,
    admin.password ? "Задан" : "Не задан",
  ]);

  if (main_menu_button) await ctx.replyWithKeyboard("⚙️", main_menu_button);

  if (edit) return ctx.editMenu(title, keyboard);
  ctx.replyWithKeyboard(title, keyboard);
});

scene.action("change_password", async (ctx) => {
  await ctx.answerCbQuery().catch((e) => {});

  ctx.replyWithTitle("SEND_NEW_PASSWORD");
});

scene.on("text", async (ctx) => {
  const res = await authAdmin(ctx.from.id, true).catch(() => {
    return ctx.scene.enter("clientScene");
  });
  if (!res) {
    return ctx.scene.enter("clientScene");
  }

  const connection = await tOrmCon;

  const password = bcrypt.hashSync(ctx.message.text, salt);

  connection
    .getRepository("Admin")
    .update({ user_id: ctx.from.id }, { password })
    .then((data) => ctx.replyWithTitle("PASSWORD_HAS_BEEN_ADDED"))
    .catch((error) => ctx.replyWithTitle("PASSWORD_HAS_NOT_BEEN_ADDED"))
    .finally(() => {
      ctx.scene.enter("changePasswordScene");
    });
});

module.exports = scene;
