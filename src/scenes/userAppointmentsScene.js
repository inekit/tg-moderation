const {
  CustomWizardScene,
  telegraf: { Composer },
  handlers: { FilesHandler },
} = require("telegraf-steps");
const tOrmCon = require("../db/connection");

const scene = new CustomWizardScene("userAppointmentsScene").enter(
  async (ctx) => {
    const { edit, offset = 0 } = ctx.scene.state;
    const perPage = 10;
    let keyboard;
    let title;

    ctx.scene.state.items =
      ctx.scene.state.items ?? (await getItems(ctx.from.id, offset, perPage));

    keyboard = {
      name: "appointments_list_keyboard",
      args: [ctx.scene.state.items, "item", 0, offset],
    };
    title = ctx.getTitle("CHOOSE_ITEM");

    console.log(edit, title, keyboard);
    if (edit) return ctx.editMenu(title, keyboard);

    await ctx.replyWithKeyboard("⚙️", "main_menu_back_keyboard");
    ctx.replyWithKeyboard(title, keyboard);
  }
);

scene.action(/get\_(.+)\_(.+)/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  const offset = ctx.match[2];
  const category_id = ctx.match[1];

  console.log("get", offset, category_id);

  const category_name = category_id;

  if (offset < 0) return;

  ctx.scene.enter("userAppointmentsScene", {
    edit: true,
    category_id,
    category_name,
    categories: ctx.scene.state.categories,
    offset,
  });
});

scene.action(/^item\-([0-9]+)$/g, async (ctx) => {
  ctx.answerCbQuery().catch(console.log);
  const { subcategory_id, category_id, subcategory_name, category_name } =
    ctx.scene.state;

  const item_id = (ctx.scene.state.item_id = ctx.match[1]);

  const connection = await tOrmCon;

  const item = (ctx.scene.state.item = (
    await connection
      .query(`select * from appointments where id = $1`, [item_id])
      .catch((e) => {
        console.log(e);
        ctx.replyWithTitle("DB_ERROR");
      })
  )?.[0]);

  if (!ctx.scene.state.item) {
    ctx.replyWithTitle("NO_SUCH_ITEM");
    delete ctx.scene.state;
    return ctx.scene.enter("userAppointmentsScene", { edit: true });
  }

  const keyboard = { name: "go_back_keyboard", args: [item_id] };

  await ctx.replyWithPhoto(item.photo).catch((e) => {});

  const {
    id,
    what_need,
    name,
    contacts,
    send_from,
    send_to,
    departure_date,
    departure_date_back,
    comment_delivery,
    comment,
    description,
  } = (ctx.scene.state.item = item);

  const title =
    what_need === "send"
      ? ctx.getTitle("ENTER_FINISH_SEND_ADMIN", [
          id,
          name,
          send_from,
          send_to,
          description,
          contacts,
          comment ? `\n${comment}` : " ",
        ])
      : ctx.getTitle("ENTER_FINISH_DELIVERY_ADMIN", [
          id,
          name,
          send_from,
          send_to,
          departure_date_back ? "и обратно" : " ",
          departure_date,
          departure_date_back ? ` 🛬 ${departure_date_back}` : " ",
          contacts,
          comment ? `\n5) ${comment}` : " ",
        ]);

  return ctx.replyWithKeyboard(title, keyboard);
});

scene.action("go_back", (ctx) => {
  ctx.scene.enter("userAppointmentsScene", {
    edit: false,
    categories: ctx.scene.state.categories,
    offset: ctx.scene.state.offset,
  });
});

async function getItems(author_id, offset, perPage) {
  const connection = await tOrmCon;

  return await connection
    .query(
      `select *
        from appointments where customer_id = $1 order by id DESC limit $2 offset $3`,
      [author_id, perPage, offset * perPage]
    )
    .catch((e) => {
      console.log(e);
    });
}

module.exports = scene;
