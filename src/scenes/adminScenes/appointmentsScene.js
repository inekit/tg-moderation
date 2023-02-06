const {
  Telegraf,
  Composer,
  Scenes: { WizardScene },
} = require("telegraf");
const {
  CustomWizardScene,
  createKeyboard,
  telegraf: { Markup },
  handlers: { FilesHandler },
} = require("telegraf-steps");
require("dotenv").config();
const { url: urlButton, callback: callbackButton } = Markup.button;

const { inlineKeyboard } = Markup;
const moment = require("moment");

const tOrmCon = require("../../db/connection");

const scene = new CustomWizardScene("appointmentsScene").enter(async (ctx) => {
  let { edit, main_menu_button } = ctx.scene.state;

  const connection = await tOrmCon;
  const query =
    "select wa.*, u.username from appointments wa left join users u on wa.customer_id = u.id where wa.status = 'issued' order by datetime_created limit 1";
  const lastWa = (ctx.scene.state.lastWa = (
    await connection.query(query).catch((e) => {})
  )?.[0]);

  if (main_menu_button) await ctx.replyWithKeyboard("⚙️", main_menu_button);

  if (!lastWa) {
    if (edit) return ctx.editMenu("NO_NEW_APPOINTMENTS", "update_keyboard");

    return ctx.replyWithKeyboard("NO_NEW_APPOINTMENTS", "update_keyboard");
  }

  await ctx.replyWithPhoto(lastWa.photo).catch((e) => {});

  const keyboard = { name: "wa_keyboard", args: [lastWa.id] };

  ctx.scene.state.lastWa = lastWa;

  const title = await require("../../Utils/titleFromDataObj")(
    lastWa,
    "ENTER_FINISH_ADMIN",
    ctx
  );

  if (edit) return ctx.editMenu(title, keyboard);

  return ctx.replyWithKeyboard(title, keyboard);
});

scene
  .addStep({
    variable: "none",
    cb: (ctx) => {},
  })
  .addSelect({
    variable: "reason",
    options: { "Без причины": "no" },
    cb: async (ctx) => {
      await ctx.answerCbQuery().catch(console.log);

      rejectAppointment(ctx);
    },
    onInput: (ctx) => {
      ctx.wizard.state.reason = ctx.message.text;

      rejectAppointment(ctx);
    },
  })
  .addStep({
    variable: "name",
    confines: ["string45", "cyrillic"],
  })
  .addSelect({
    variable: "send_from",
    options: {
      "#Москва": "Москва",
      "#Санкт-Петербург": "Санкт-Петербург",
      "#Мин. Воды": "Мин. Воды",
      "#Баку": "Баку",
      "#Дубай": "Дубай",
      "#Тель-Авив": "Тель-Авив",
    },
    cb: async (ctx) => {
      await ctx.answerCbQuery().catch((e) => {});
      ctx.scene.state.input.send_from = ctx.match[0];
      return ctx.replyNextStep();
    },
    onInput: (ctx) => {
      ctx.scene.state.input.send_from = ctx.message.text;
      return ctx.replyNextStep();
    },
  })
  .addSelect({
    variable: "send_to",
    options: {
      "#Москва": "Москва",
      "#Санкт-Петербург": "Санкт-Петербург",
      "#Мин. Воды": "Мин. Воды",
      "#Баку": "Баку",
      "#Дубай": "Дубай",
      "#Тель-Авив": "Тель-Авив",
    },
    cb: async (ctx) => {
      await ctx.answerCbQuery().catch((e) => {});
      ctx.scene.state.input.send_to = ctx.match[0];

      if (ctx.scene.state.input.what_need === "send")
        return ctx.replyNextStep();

      return ctx.replyStepByVariable("departure_date");
    },
    onInput: (ctx) => {
      ctx.scene.state.input.send_to = ctx.message.text;

      if (ctx.scene.state.input.what_need === "send")
        return ctx.replyNextStep();

      return ctx.replyStepByVariable("departure_date");
    },
  })
  .addStep({
    variable: "description",
    confines: ["string45"],
  })
  .addStep({
    variable: "comment",
    confines: ["string200"],
    //skipTo: "finish_updating",
  })
  .addStep({
    variable: "departure_date",
    confines: [
      (text) => {
        const date = moment(text, "DD.MM.YYYY");
        return date.isValid();
      },
    ],
  })
  .addStep({
    variable: "departure_date_back",
    cb: (ctx) => {
      const text = ctx.message.text;
      const date = moment(text, "DD.MM.YYYY");
      console.log(
        date,
        moment(ctx.scene.state.input.departure_date, "DD.MM.YYYY")
      );
      if (
        date.isValid() &&
        date >= moment(ctx.scene.state.input.departure_date, "DD.MM.YYYY")
      ) {
        ctx.scene.state.input.departure_date_back = text;
        ctx.replyNextStep();
      } else ctx.replyWithTitle("ENTER_DEPARTURE_DATE_BACK");
    },
  })
  .addSelect({
    variable: "finish_updating",
    options: {
      "Сохранить изменения": "send",
      "Изменить поле имя": "name",
      "Изменить описание": "send_from",
      "Изменить размеры": "send_to",
      "Изменить артикул": "departure_date",
      "Изменить ссылку": "departure_date_back",
      "Изменить комментарий": "comment",
      "Изменить цену": "description",
    },
    cb: async (ctx) => {
      await ctx.answerCbQuery().catch((e) => {});

      const action = ctx.match[0];

      if (action !== "send") {
        await ctx.replyStepByVariable(action);

        return ctx.setEditStep("finish_updating", getUpdateHeader, {
          name: "finish_updating_keyboard",
          args: [ctx.wizard.state.input.what_need],
        });
      }

      ctx.scene.state.table = "item";

      await confirmAction(ctx);
    },
  });

function getUpdateHeader(ctx) {
  const {
    id: appointment_id,
    pic,
    name,
    send_from,
    send_to,
    description,
    contacts,
    comment,
    departure_date,
    departure_date_back,
    what_need,
  } = ctx.wizard.state.input;

  return what_need === "send"
    ? ctx.getTitle("ENTER_FINISH_SEND_ADMIN", [
        appointment_id,
        pic,
        name,
        send_from,
        send_to,
        description,
        contacts,
        comment ? `\n${comment}` : " ",
      ])
    : ctx.getTitle("ENTER_FINISH_DELIVERY_ADMIN", [
        appointment_id,
        pic,
        name,
        send_from,
        send_to,
        departure_date_back ? "и обратно" : " ",
        departure_date,
        departure_date_back ? ` 🛬 ${departure_date_back}` : " ",
        contacts,
        comment ? `\n5) ${comment}` : " ",
      ]);
}

scene.action(/^reject\-([0-9]+)$/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  ctx.wizard.state.appointment_id = ctx.match[1];

  ctx.replyStep(1);
});

async function rejectAppointment(ctx) {
  const appointment_id = ctx.wizard.state.appointment_id;
  const reason = ctx.wizard.state.reason;
  const reasonMes = reason ? "\n\n Причина: " + reason : " ";

  const connection = await tOrmCon;

  connection
    .query(
      "update appointments set status = 'rejected' where id = $1 returning customer_id",
      [appointment_id]
    )
    .then(async (res) => {
      const customer_id = res[0]?.[0]?.customer_id;

      await ctx.telegram
        .sendMessage(
          customer_id,
          ctx.getTitle("APPOINTMENT_REJECTED", [appointment_id, reasonMes])
        )
        .catch((e) => {
          console.log(e);
        });

      ctx.scene.enter("appointmentsScene", {
        edit: false,
        waiting: ctx.wizard.state.waiting,
      });

      delete ctx.wizard.state;
    })
    .catch(async (e) => {
      console.log(e);
      ctx.replyWithTitle("DB_ERROR");
    });
}

scene.action(/^edit\-(.+)$/g, async (ctx) => {
  ctx.answerCbQuery().catch(console.log);

  ctx.scene.state.reference_id = ctx.match[1];

  ctx.scene.state.input = ctx.scene.state.lastWa;

  const connection = await tOrmCon;

  const status = (
    await connection
      .query("select status from users where id = $1 limit 1", [
        ctx.scene.state.lastWa.customer_id,
      ])
      .catch(console.log)
  )?.[0]?.status;

  const a_count = (
    await connection.query(
      "select count(*) a_count from appointments where status = 'aprooved' and customer_id = $1",
      [ctx.scene.state.lastWa.customer_id]
    )
  )?.[0]?.a_count;

  ctx.scene.state.input.pic =
    status === "reliable"
      ? "🟢"
      : a_count >= 5
      ? "🟡"
      : a_count >= 1
      ? "🟠"
      : a_count === 0
      ? "🔴"
      : "";

  console.log(ctx.scene.state.input);

  ctx.replyWithKeyboard(getUpdateHeader(ctx), {
    name: "finish_updating_keyboard",
    args: [ctx.scene.state.lastWa.what_need],
  });
  ctx.wizard.selectStep(9);
});

async function confirmAction(ctx, item_id) {
  await ctx.answerCbQuery().catch(console.log);

  let {
    name,
    contacts,
    send_from,
    send_to,
    departure_date,
    departure_date_back,
    comment,
    description,
  } = ctx.scene.state.input;

  departure_date = moment(departure_date, "DD.MM.YYYY");
  departure_date_back = departure_date_back
    ? moment(departure_date_back, "DD.MM.YYYY")
    : departure_date_back;

  const connection = await tOrmCon;
  connection
    .query(
      `update appointments set name = $1,  contacts = $2, send_from = $3, 
       send_to = $4, departure_date = $5, departure_date_back = $6, comment = $7, description = $8
      where id = $9 returning customer_id`,
      [
        name,
        contacts,
        send_from,
        send_to,
        departure_date,
        departure_date_back,
        comment,
        description,
        ctx.scene.state.reference_id,
      ]
    )
    .then((res) => {
      ctx.scene.enter("appointmentsScene", {
        edit: false,
      });
    })
    .catch(async (e) => {
      console.log(e);
      ctx.replyWithTitle("DB_ERROR");
    });
}

scene.action("reload", async (ctx) => {
  await ctx.answerCbQuery("RELOADED").catch(console.log);

  ctx.scene.enter("appointmentsScene", {
    edit: false,
  });
});

scene.action(/^aproove\-([0-9]+)$/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  ctx.wizard.state.appointment_id = ctx.match[1];

  showFromMenu(ctx);
});

scene.action("editfrom", async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  ctx.wizard.state.editing = true;

  showFromMenu(ctx);
});

scene.action("editto", async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  ctx.wizard.state.editing = true;

  showToMenu(ctx);
});

async function showFromMenu(ctx) {
  const title = await require("../../Utils/titleFromDataObj")(
    ctx.scene.state.lastWa,
    "ENTER_FINISH_ADMIN",
    ctx,
    "CHOOSE_FROM_COUNTRY"
  );

  ctx.editMenu(title, {
    name: "countries_list_keyboard",
    args: [false],
  });
}

scene.action(/^code\-([0-9]+)$/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  ctx.wizard.state.threadFromId = ctx.match[1];

  if (ctx.wizard.state.editing) return showSubmitMenu(ctx);

  showToMenu(ctx);
});

async function showToMenu(ctx) {
  const title = await require("../../Utils/titleFromDataObj")(
    ctx.scene.state.lastWa,
    "ENTER_FINISH_ADMIN",
    ctx,
    "CHOOSE_TO_COUNTRY"
  );

  ctx.editMenu(title, {
    name: "countries_list_keyboard",
    args: [true],
  });
}

async function showSubmitMenu(ctx) {
  const threadFromId = ctx.wizard.state.threadFromId;
  const threadToId = ctx.wizard.state.threadToId;

  const countriesCodesEntries = Object.entries(
    require("../../Utils/getCountryLink")
  );

  const threadFromName = countriesCodesEntries.find(([key, value]) => {
    if (value == threadFromId) return true;
  })?.[0];
  const threadToName = countriesCodesEntries.find(([key, value]) => {
    if (value == threadToId) return true;
  })?.[0];

  const title = await require("../../Utils/titleFromDataObj")(
    ctx.scene.state.lastWa,
    "ENTER_FINISH_ADMIN",
    ctx,
    ctx.getTitle("SEND_TO_CHATS", [threadFromName, threadToName])
  );

  ctx.replyWithKeyboard(title, {
    name: "edit_countries_keyboard",
    args: [true],
  });
}

scene.action(/^backcode\-([0-9]+)$/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  ctx.wizard.state.threadToId = ctx.match[1];

  showSubmitMenu(ctx);
});

scene.action("publish", async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  const threadFromId = ctx.wizard.state.threadFromId;

  const threadToId = ctx.wizard.state.threadToId;

  const appointment_id = ctx.wizard.state.appointment_id;

  const connection = await tOrmCon;

  const queryRunner = connection.createQueryRunner();

  await queryRunner.connect();

  await queryRunner.startTransaction();

  try {
    const res = await queryRunner.query(
      "update appointments set status = 'aprooved' where id = $1 returning *",
      [appointment_id]
    );

    const { customer_id } = (ctx.scene.state.appointment_data = res[0]?.[0]);

    const a_count = (
      await connection.query(
        "select count(*) a_count from appointments where status = 'aprooved' and customer_id = $1",
        [customer_id]
      )
    )?.[0]?.a_count;

    const status = (
      await queryRunner.query(
        "select status from users where id = $1 limit 1",
        [customer_id]
      )
    )?.[0]?.status;

    if (status !== "reliable")
      await queryRunner.query("update users set status = $1 where id = $2", [
        a_count >= 5 ? "regular" : a_count >= 1 ? "user" : "newbie",
        customer_id,
      ]);

    const title = await require("../../Utils/titleFromDataObj")(
      ctx.scene.state.lastWa,
      "ENTER_FINISH_PUBLIC",
      ctx
    );

    const {
      what_need,
      send_from,
      send_to,
      departure_date,
      departure_date_back,
    } = ctx.scene.state.appointment_data;

    const subscriptions =
      what_need === "delivery"
        ? await queryRunner.query(
            `select client_id from subscriptions where 
            what_need = 'delivery' and
            ( ( (send_from=$1) and (send_to=$2)
                and (date_finish>=$3 or $3 is null) and (date_start<=$3 or $3 is null) )
                or ( (send_from=$2) and (send_to=$1)
                and (date_finish>=$4 or $4 is null) and (date_start<=$4 or $4 is null) ) )
            group by client_id
            `,
            [send_from, send_to, departure_date, departure_date_back]
          )
        : await queryRunner.query(
            `select client_id from subscriptions where 
            what_need = 'send' 
            and (send_from=$1) and (send_to=$2)
            and ( ((date_start<=$3) and (date_finish>=$4))
              or ((date_start>=$3) and (date_finish<=$4))
              or ((date_start>=$3) and (date_start<=$4))
              or ((date_finish>=$3) and (date_finish<=$4))
              )
            group by client_id
           `,
            [send_from, send_to, departure_date, departure_date_back]
          );

    console.log(subscriptions);

    const s_title = await require("../../Utils/titleFromDataObj")(
      ctx.scene.state.lastWa,
      "ENTER_FINISH_PUBLIC",
      ctx
    );

    for (s of subscriptions) {
      console.log(s);

      await ctx.telegram
        .sendMessage(s.client_id, s_title, {
          reply_markup: {
            inline_keyboard: [
              [
                callbackButton(
                  ctx.getTitle("SEND_DIALOG_REQUEST"),
                  `softmain-dialog-${appointment_id}`
                ),
              ],
            ],
          },
        })
        .catch(console.log);
    }

    await ctx.telegram //process.env.CHANNEL_ID
      .sendMessage(process.env.CHANNEL_ID, title, {
        message_thread_id: threadFromId,
        reply_markup: {
          inline_keyboard: [
            [
              urlButton(
                ctx.getTitle("SEND_DIALOG_REQUEST"),
                `t.me/${ctx.botInfo.username}/?start=dialog-${appointment_id}`
              ),
            ],
          ],
        },
      });

    if (threadToId != threadFromId)
      await ctx.telegram //process.env.CHANNEL_ID
        .sendMessage(process.env.CHANNEL_ID, title, {
          message_thread_id: threadToId,
          reply_markup: {
            inline_keyboard: [
              [
                urlButton(
                  ctx.getTitle("SEND_DIALOG_REQUEST"),
                  `t.me/${ctx.botInfo.username}/?start=dialog-${appointment_id}`
                ),
              ],
            ],
          },
        });

    await ctx.telegram
      .sendMessage(
        customer_id,
        ctx.getTitle("APPOINTMENT_APROOVED", [appointment_id])
      )
      .catch((e) => {});

    await queryRunner.commitTransaction();

    io.emit("NEW_APPOINTMENT");
  } catch (err) {
    console.log(err);
    ctx.replyWithTitle(err.message ?? "DB_ERROR");

    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();

    ctx.scene.enter("appointmentsScene", {
      edit: false,
    });
  }
});

module.exports = scene;
