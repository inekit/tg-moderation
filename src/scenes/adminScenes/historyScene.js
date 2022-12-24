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

function inputFile(ctx, type) {
  if (!type)
    type = ctx.message?.photo
      ? "photo"
      : ctx.message?.audio
      ? "audio"
      : "document";

  const file_id =
    ctx.message?.[type]?.[0]?.file_id ?? ctx.message?.[type]?.file_id;

  console.log(1, file_id, ctx.message);

  if (!file_id) return ctx.replyWithTitle("TRY_AGAIN");

  if (!ctx.scene?.state?.input) ctx.scene.state.input = {};

  if (!ctx.scene.state.input?.[type + "s"])
    ctx.scene.state.input[type + "s"] = [];

  //ctx.wizard.state.input?.[type+"s"].push(file_id)

  ctx.wizard.state.input[type] = file_id;
  ctx.replyWithKeyboard("CONFIRM", {
    name: "custom_keyboard",
    args: [["CONFIRM"], ["skip"]],
  });
}

const scene = new CustomWizardScene("historyScene").enter(async (ctx) => {
  const {
    edit,
    offset = 0,
    category_id,
    category_name,
    item_id,
  } = ctx.scene.state;
  const perPage = 10;
  let keyboard;
  let title;
  if (item_id) return getItem(ctx, item_id);

  console.log(category_id, category_name);
  ctx.scene.state.items =
    ctx.scene.state.items ?? (await getItems(offset, perPage));
  ctx.scene.state.category_name =
    category_name ??
    ctx.scene.state.categories?.find((el) => {
      return el.id === parseInt(ctx.match[1]);
    })?.name;

  keyboard = {
    name: "categories_list_admin_keyboard",
    args: [ctx.scene.state.items, "item", category_id, offset],
  };
  title = ctx.getTitle("CHOOSE_ITEM", [
    category_name ?? "",
    ctx.scene.state.category_name ?? "",
  ]);

  console.log(edit, title, keyboard);
  if (edit) return ctx.editMenu(title, keyboard);

  await ctx.replyWithKeyboard("⚙️", "admin_back_keyboard");
  ctx.replyWithKeyboard(title, keyboard);
});

exports.categories_list_admin_keyboard = (
  ctx,
  data,
  prefix,
  cardId,
  offset
) => {
  const keyboard =
    prefix === "category"
      ? inlineKeyboard(
          data.map(({ name, id }) => callbackButton(name, prefix + "-" + name)),
          { columns: 2 }
        )
      : inlineKeyboard(
          data.map(({ name, id }) => callbackButton(name, prefix + "-" + id)),
          { columns: 1 }
        );

  prefix !== "category" &&
    keyboard.reply_markup.inline_keyboard.push([
      callbackButton(
        ctx.getTitle(`BUTTON_ADD_${prefix.toUpperCase()}`),
        `add-${prefix}-${cardId ?? 0}`
      ),
    ]);
  const p2 =
    prefix === "item" ? "category" : prefix === "subcategory" ? "category" : "";

  console.log(1, p2);

  if (prefix === "item" && !p2)
    keyboard.reply_markup.inline_keyboard.push([
      callbackButton(ctx.getTitle("BUTTON_EDIT"), `edit-${p2}-${cardId}`),
      callbackButton(ctx.getTitle("BUTTON_DELETE"), `delete-${p2}-${cardId}`),
    ]);

  if (prefix === "item" && p2) {
    const b = [];

    if (offset > 0)
      b.push(
        callbackButton(
          ctx.getTitle("BUTTON_PREVIOUS"),
          `get_${cardId}_${Number(offset) - 1}`
        )
      );

    b.push(
      callbackButton(
        ctx.getTitle("BUTTON_NEXT"),
        `get_${cardId}_${Number(offset) + 1}`
      )
    );

    keyboard.reply_markup.inline_keyboard.push(b);
  }

  if (prefix === "item")
    keyboard.reply_markup.inline_keyboard.push([
      callbackButton(ctx.getTitle("BUTTON_BACK"), "back"),
    ]);

  return keyboard;
};

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

scene.action(/^item\-([0-9]+)$/g, async (ctx) => {
  ctx.answerCbQuery().catch(console.log);
  const item_id = (ctx.scene.state.item_id = ctx.match[1]);
  getItem(ctx, item_id);
});

async function getItem(ctx, item_id) {
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
    ctx.scene.enter("historyScene", { edit: true });
  }

  const keyboard = "go_back_keyboard";

  const {
    id,
    what_need,
    name,
    send_from,
    send_to,
    description,
    contacts,
    comment,
    departure_date_back,
    departure_date,
  } = item;

  await ctx.replyWithPhoto(item.photo).catch((e) => {});

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
}

scene.action("go_back", async (ctx) => {
  ctx.answerCbQuery().catch(console.log);

  delete ctx.scene.state;
  ctx.scene.enter("historyScene", {
    //edit: true,
    offset: ctx.scene.state.offset,
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
