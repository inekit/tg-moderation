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
const urlButton = Markup.button.url;
const { inlineKeyboard } = Markup;

const tOrmCon = require("../../db/connection");

const scene = new CustomWizardScene("appointmentsScene").enter(async (ctx) => {
  let { edit, main_menu_button } = ctx.scene.state;

  const connection = await tOrmCon;
  const query =
    "select wa.*, u.username from appointments wa left join users u on wa.customer_id = u.id where status = 'issued' order by datetime_created limit 1";
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

  const {
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
  } = (ctx.scene.state.lastWa = lastWa);

  const title =
    what_need === "send"
      ? ctx.getTitle("ENTER_FINISH_SEND", [
          name,
          send_from,
          send_to,
          description,
          contacts,
          comment ? `\n${comment}` : " ",
        ])
      : ctx.getTitle("ENTER_FINISH_DELIVERY", [
          name,
          send_from,
          send_to,
          departure_date_back ? "и обратно" : " ",
          departure_date,
          departure_date_back ? ` 🛬 ${departure_date_back}` : " ",
          contacts,
          comment ? `\n5) ${comment}` : " ",
        ]);

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
    confines: [
      (text) => {
        const date = moment(text, "DD.MM.YYYY");
        return date.isValid();
      },
    ],
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
    name,
    what_need,
    send_from,
    send_to,
    description,
    contacts,
    comment,
    departure_date_back,
    departure_date,
  } = ctx.wizard.state.input ?? {};

  return what_need === "send"
    ? ctx.getTitle("ENTER_FINISH_SEND", [
        name,
        send_from,
        send_to,
        description,
        contacts,
        comment ? `\n${comment}` : " ",
      ])
    : ctx.getTitle("ENTER_FINISH_DELIVERY", [
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

scene.action(/^edit\-(.+)$/g, (ctx) => {
  ctx.answerCbQuery().catch(console.log);

  ctx.scene.state.reference_id = ctx.match[1];

  ctx.scene.state.input = {
    name,
    contacts,
    send_from,
    send_to,
    departure_date,
    departure_date_back,
    comment,
    description,
    what_need,
  } = ctx.scene.state.lastWa;

  console.log(ctx.scene.state.input);

  ctx.replyWithKeyboard(getUpdateHeader(ctx), {
    name: "finish_updating_keyboard",
    args: [what_need],
  });
  ctx.wizard.selectStep(9);
});

async function confirmAction(ctx, item_id) {
  await ctx.answerCbQuery().catch(console.log);

  const {
    name,
    contacts,
    send_from,
    send_to,
    departure_date,
    departure_date_back,
    comment,
    description,
  } = ctx.scene.state.input;

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

  const connection = await tOrmCon;

  const queryRunner = connection.createQueryRunner();

  await queryRunner.connect();

  await queryRunner.startTransaction();

  try {
    const res = await queryRunner.query(
      "update appointments set status = 'aprooved' where id = $1 returning customer_id",
      [ctx.match[1]]
    );

    const { customer_id } = (ctx.scene.state.appointment_data = res[0]?.[0]);

    const {
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
    } = ctx.scene.state.lastWa;

    const title =
      what_need === "send"
        ? ctx.getTitle("ENTER_FINISH_SEND", [
            name,
            send_from,
            send_to,
            description,
            contacts,
            comment ? `\n${comment}` : " ",
          ])
        : ctx.getTitle("ENTER_FINISH_DELIVERY", [
            name,
            send_from,
            send_to,
            departure_date_back ? "и обратно" : " ",
            departure_date,
            departure_date_back ? ` 🛬 ${departure_date_back}` : " ",
            contacts,
            comment ? `\n5) ${comment}` : " ",
          ]);

    await ctx.telegram //process.env.CHANNEL_ID
      .sendMessage(ctx.from.id, title, {
        reply_markup: {
          inline_keyboard: [
            [
              urlButton(
                ctx.getTitle("SEND_DIALOG_REQUEST"),
                `t.me/${ctx.botInfo.username}/?start=dialog-${ctx.match[1]}`
              ),
            ],
          ],
        },
      });

    await ctx.telegram
      .sendMessage(
        customer_id,
        ctx.getTitle("APPOINTMENT_APROOVED", [ctx.match[1]])
      )
      .catch((e) => {});

    await queryRunner.commitTransaction();
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
