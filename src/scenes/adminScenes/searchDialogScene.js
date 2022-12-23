const {
  Telegraf,
  Composer,
  Scenes: { WizardScene, BaseScene },
} = require("telegraf");
const moment = require("moment");
const nameHandler = new Composer(),
  linkHandler = new Composer(),
  itemHandler = new Composer();
const { CustomWizardScene } = require("telegraf-steps");
class FilesHandler extends Composer {
  constructor(confirmCb) {
    super();

    this.on("photo", (ctx) => inputFile(ctx, "photo"));

    this.action("skip", async (ctx) => confirmCb(ctx));
  }
}
const tOrmCon = require("../../db/connection");
const Dialog = require("../../db/entity/Dialog");

const scene = new CustomWizardScene("searchDialogScene")
  .enter(async (ctx) => {
    const { edit, offset = 0, mode, text } = ctx.scene.state;

    console.log(1432543);

    if (text) return searchByKey(ctx, text, mode);

    const title = mode === "username" ? "ENTER_USERNAME" : "ENTER_A_ID";

    if (edit) return ctx.editMenu(title);

    await ctx.replyWithKeyboard("⚙️", "admin_back_keyboard");
    ctx.replyWithTitle(title);
  })
  .addStep({
    variable: "key",
    cb: async (ctx) => {
      searchByKey(ctx, ctx.message.text, ctx.scene.state.mode);
    },
  });

async function searchByKey(ctx, text, mode) {
  const test = mode === "username" ? /^@(.+)$/g : /^([0-9]+)$/g;

  const key = test.exec(text)?.[1];

  console.log(key);

  if (!key) return ctx.replyWithTitle("WRONG_KEY");

  const connection = await tOrmCon;

  if (mode === "username") {
    const dialogs = await connection
      .query(
        `select d.id, d.appointment_id from dialogs d 
        left join appointments a on d.appointment_id = a.id 
        left join users u on client_id = u.id
        left join users u2 on customer_id = u2.id
        where u.username = $1 or u2.username = $1`,
        [key]
      )
      .catch((e) => {});

    if (!dialogs?.length) return ctx.replyWithTitle("NO_DIALOGS_USER");

    console.log(dialogs);

    ctx.replyWithKeyboard("CHOOSE_APPOINTMENT_SEARCH", {
      name: "search_a_list_keyboard",
      args: [dialogs, 0],
    });
  } else {
    const dialogs = await connection
      .query(
        `select d.id, u.username, u2.username username2 from dialogs d 
        left join appointments a on d.appointment_id = a.id 
        left join users u on d.client_id = u.id
        left join users u2 on a.customer_id = u2.id
        where appointment_id = $1`,
        [key]
      )
      .catch((e) => {});
    console.log(dialogs);

    if (!dialogs?.length) return ctx.replyWithTitle("NO_DIALOGS_APPOINTMENT");

    ctx.replyWithKeyboard("CHOOSE_USERS_SEARCH", {
      name: "search_u_list_keyboard",
      args: [dialogs, 0],
    });
  }
}

scene.action(/get\_(.+)\_(.+)/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  const offset = ctx.match[2];
  const category_id = ctx.match[1];

  console.log("get", offset, category_id);

  const category_name = category_id;

  if (offset < 0) return;

  ctx.scene.enter("historyScene", {
    edit: true,
    category_id,
    category_name,
    categories: ctx.scene.state.categories,
    offset,
  });
});

scene.action(/^dialog1\-([0-9]+)$/g, async (ctx) => {
  ctx.answerCbQuery().catch(console.log);
  console.log(11212123);

  const { mode, text, offset } = ctx.scene.state;
  ctx.scene.enter("dialogAdminScene", {
    dialog_id: ctx.match[1],
    mode,
    text,
    offset,
  });
});

async function getItems(offset, perPage) {
  const connection = await tOrmCon;

  return await connection
    .query(
      `select a.*, username
          from appointments a left join users u on a.customer_id = u.id order by id DESC limit $1 offset $2`,
      [perPage, offset * perPage]
    )
    .catch((e) => {
      console.log(e);
    });
}

module.exports = scene;
