const {
  CustomWizardScene,
  telegraf: { Composer, Markup },
  handlers: { FilesHandler },
} = require("telegraf-steps");
const tOrmCon = require("../db/connection");
const moment = require("moment");

const scene = new CustomWizardScene("subscriptionsScene").enter(async (ctx) => {
  const {
    edit,
    offset = 0,
    send_from,
    send_to,
    date_start,
    date_finish,
    what_need,
  } = ctx.scene.state;
  const perPage = 10;
  let keyboard;
  let title;

  ctx.scene.state.items =
    ctx.scene.state.items ?? (await getItems(offset, perPage, ctx.from.id));

  keyboard =
    ctx.scene.state.items?.length || offset !== 0
      ? {
          name: "search_s_list_keyboard",
          args: [ctx.scene.state.items, offset],
        }
      : "go_back_keyboard";

  title =
    ctx.scene.state.items?.length || offset !== 0
      ? ctx.getTitle("SUBSCRIPTIONS_TITLE")
      : ctx.getTitle("NO_SUBSCRIPTIONS");

  if (edit) return ctx.editMenu(title, keyboard);

  await ctx.replyWithKeyboard("⚙️", "main_menu_back_keyboard");
  ctx.replyWithKeyboard(title, keyboard);
});

scene.action(/get\_(.+)\_(.+)/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  const offset = ctx.match[2];
  const category_id = ctx.match[1];

  console.log("get", offset, category_id);

  const category_name = category_id;

  if (offset < 0) return;

  const { send_from, send_to, date_start, date_finish, what_need } =
    ctx.scene.state;

  ctx.scene.enter("subscriptionsScene", {
    edit: true,
    offset,
    send_from,
    send_to,
    date_start,
    date_finish,
    what_need,
  });
});

scene.action(/^item\-([0-9]+)$/g, async (ctx) => {
  ctx.answerCbQuery().catch(console.log);

  const item_id = (ctx.scene.state.item_id = ctx.match[1]);

  const connection = await tOrmCon;

  const { what_need, send_from, send_to, date_start, date_finish } =
    (
      await connection
        .query(`select * from subscriptions where id = $1 limit 1`, [item_id])
        .catch((e) => {
          console.log(e);
        })
    )?.[0] ?? {};

  if (!send_from || !send_to || !date_start || !date_finish) return;
  ctx.scene.enter("searchResultScene", {
    edit: true,
    backScene: "subscriptionsScene",
    what_need,
    send_from,
    send_to,
    date_start: moment(date_start).unix(),
    date_finish: moment(date_finish).unix(),
  });
});

scene.action(/^soft\-dialog\-([0-9]+)$/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  const {
    offset,
    category_id,
    categories,
    category_name,
    send_from,
    send_to,
    date_start,
    date_finish,
    what_need,
  } = ctx.scene.state;

  ctx.scene.enter("dialogScene", {
    appointment_id: ctx.match[1],
    mode: "client",
    searchResultParams: {
      category_id,
      category_name,
      categories,
      offset,
      send_from,
      send_to,
      date_start,
      date_finish,
      what_need,
    },
  });
});

scene.action("go_back", (ctx) => {
  ctx.answerCbQuery().catch(console.log);

  ctx.scene.enter("searchScene", {
    edit: true,
  });
});

async function getItems(offset, perPage, client_id) {
  const connection = await tOrmCon;

  return await connection
    .query(
      `select * from subscriptions where client_id = $3 limit $1 offset $2`,
      [perPage, offset * perPage, client_id]
    )
    .catch((e) => {
      console.log(e);
    });
}

module.exports = scene;
