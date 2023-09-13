const {
  Composer,
  Scenes: { WizardScene },
} = require("telegraf");
const adminIdHandler = new Composer(),
  newIdHandler = new Composer(),
  roleHandler = new Composer();

const scene = new WizardScene(
  "whiteListScene",
  adminIdHandler,
  newIdHandler,
  roleHandler
);

const tOrmCon = require("../../db/connection");

scene.enter(async (ctx) => {
  const { edit, main_menu_button } = ctx.scene.state;

  const connection = await tOrmCon;
  ctx.scene.state.white_list = await connection
    .query(`select * from white_list wl `)
    .catch((e) => {
      console.log(e);
      ctx.answerCbQuery("DB_ERROR");
    });

  if (!ctx.scene.state.white_list) return ctx.scene.enter("adminScene");
  let usersStr = ctx.scene.state.white_list
    .map(
      ({ id, username }) => `<a href="tg://user?id=${id}">${username ?? id}</a>`
    )
    .join("\n\n")
    .toString();

  const keyboard = "admins_actions_keyboard";
  const title = ctx.getTitle("CHOOSE_USER", [usersStr]);

  if (main_menu_button) await ctx.replyWithKeyboard("⚙️", main_menu_button);

  if (edit) return ctx.editMenu(title, keyboard);
  ctx.replyWithKeyboard(title, keyboard);
});

scene.action(/get\_(.+)\_(.+)/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  const offset = ctx.match[2];

  if (offset < 0) return;

  let white_list = ctx.scene.state.white_list.slice(
    offset * 10,
    offset * 10 + 10
  );

  ctx.scene.state.offset = offset;

  ctx.editMenu("SELECT_USER_TO_DELETE", {
    name: "users_list_keyboard",
    args: [white_list, ctx.scene.state.offset],
  });
});

scene.action("deleteAdmin", async (ctx) => {
  ctx.answerCbQuery().catch(console.log);

  ctx.scene.state.offset = 0;

  const white_list = ctx.scene.state.white_list?.slice(0, 10);

  ctx.replyWithKeyboard("SELECT_USER_TO_DELETE", {
    name: "users_list_keyboard",
    args: [white_list, ctx.scene.state.offset],
  });
});

adminIdHandler.action(/^admin\-([0-9]+)$/g, async (ctx) => {
  await ctx.answerCbQuery().catch((e) => {});

  ctx.scene.state.deletingId = ctx.match[1];

  ctx.replyWithKeyboard("CONFIRM_DELETE", "confirm_keyboard");
});

adminIdHandler.action("confirm", async (ctx) => {
  const res = await require("../../Utils/authAdmin")(ctx.from.id, true).catch(
    () => {
      ctx.answerCbQuery("CANT_AUTH");
      return ctx.scene.enter("adminScene");
    }
  );

  if (!res) {
    return ctx.scene.enter("adminScene");
  }

  const connection = await tOrmCon;
  await connection
    .getRepository("WhiteList")
    .delete({ id: ctx.scene.state.deletingId })
    .then(async () => {
      await ctx.answerCbQuery("USER_HAS_BEEN_REMOVED").catch(console.log);
    })
    .catch(async (e) => {
      console.log(e);
      await ctx.answerCbQuery("USER_HAS_NOT_BEEN_REMOVED").catch(console.log);
    });

  delete ctx.scene.state.deletingId;

  ctx.scene.reenter({ edit: true });
});

scene.action("addAdmin", async (ctx) => {
  await ctx.answerCbQuery().catch((e) => {});

  ctx.replyWithTitle("SEND_NEW_ID");
  ctx.wizard.next();
});

newIdHandler.on("message", async (ctx) => {
  const newId = ctx.message?.forward_from?.id ?? ctx.message?.text;

  const res = await require("../../Utils/authAdmin")(ctx.from.id, true).catch(
    () => {
      ctx.answerCbQuery("CANT_AUTH");
      return ctx.scene.enter("adminScene");
    }
  );

  if (!res) {
    return ctx.scene.enter("adminScene");
  }

  const connection = await tOrmCon;
  await connection
    .getRepository("WhiteList")
    .insert({
      id: newId,
      username: ctx.message?.forward_from?.username,
    })
    .then(async () => {})
    .catch(async (e) => {
      console.log(e);
      await ctx.replyWithTitle("DB_ERROR").catch(console.log);
    });

  await connection
    .query("delete from chat_restrictions where user_id = $1 returning *", [
      newId,
    ])
    .then(async (res) => {
      const restrictedChats = res?.[0];

      for (let chat of restrictedChats) {
        await ctx.telegram
          .restrictChatMember(chat.chat_id, newId, {
            can_send_messages: true,
          })
          .catch(console.log);
      }
    })
    .catch(async (e) => {
      console.log(e);
    });

  //delete ctx.scene.state.newId;

  ctx.scene.reenter({ edit: true });
});

module.exports = scene;
