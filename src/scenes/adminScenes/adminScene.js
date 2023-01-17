const {
  Composer,
  Scenes: { BaseScene },
} = require("telegraf");

const scene = new BaseScene("adminScene");
const main_menu_button = "admin_back_keyboard";
const tOrmCon = require("../../db/connection");

scene.enter(async (ctx) => {
  if (!ctx.session.registered) {
    const [{ exists }] = [{ true: 1 }];

    if (!exists) {
    }
  }

  const connection = await tOrmCon;

  await connection
    .query(
      `update dialogs set opened_admin_id = null where opened_admin_id = $1`,
      [ctx.from.id]
    )
    .catch((e) => {});

  return ctx.replyWithKeyboard("CHOOSE_ACTION", "admin_keyboard");
});

scene.hears(titles.getValues("BUTTON_REGISTER_ADMIN"), async (ctx) => {
  const agent_id = 1;

  if (agent_id) ctx.replyWithTitle("AGENT_ADDED");
  else ctx.replyWithTitle("AGENT_NOT_ADDED");
});

scene.hears(titles.getValues("BUTTON_ACCOUNT"), (ctx) =>
  ctx.scene.enter("changePasswordScene", { main_menu_button })
);

scene.hears(titles.getValues("BUTTON_ADMINS"), (ctx) =>
  ctx.scene.enter("adminsScene", { main_menu_button })
);

scene.hears(titles.getValues("BUTTON_APPOINTMENTS"), (ctx) =>
  ctx.scene.enter("appointmentsScene", { main_menu_button, waiting: false })
);
scene.hears(titles.getValues("BUTTON_HISTORY"), (ctx) =>
  ctx.scene.enter("historyScene", { main_menu_button })
);

scene.hears(titles.getValues("BUTTON_SEARCH_A"), (ctx) =>
  ctx.scene.enter("searchDialogScene", {
    main_menu_button,
    mode: "appointment",
  })
);
scene.hears(titles.getValues("BUTTON_SEARCH_U"), (ctx) =>
  ctx.scene.enter("searchDialogScene", { main_menu_button, mode: "username" })
);
scene.hears(titles.getValues("BUTTON_CHANGE_RIGHTS"), (ctx) =>
  ctx.scene.enter("changeRightsScene", { main_menu_button, mode: "username" })
);

module.exports = scene;
