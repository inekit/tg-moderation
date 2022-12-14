const {
  Telegraf,
  Composer,
  Scenes: { WizardScene },
} = require("telegraf");
const {
  CustomWizardScene,
  createKeyboard,
  handlers: { FilesHandler },
} = require("telegraf-steps");
require("dotenv").config();

const tOrmCon = require("../../db/connection");

const scene = new CustomWizardScene("appointmentsScene").enter(async (ctx) => {
  let { edit, main_menu_button } = ctx.scene.state;

  const connection = await tOrmCon;
  const query =
    "select wa.*, u.username from appointments wa left join users u on wa.customer_id = u.id where status = 'issued' order by datetime_created limit 1";
  const lastWa = (await connection.query(query).catch((e) => {}))?.[0];

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
  });

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

scene.action(/^wait\-([0-9]+)$/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  const connection = await tOrmCon;

  connection
    .query(
      "update appointments set status = 'waiting' where id = $1 returning customer_id",
      [ctx.match[1]]
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
});

scene.action(/^skip-\-([0-9]+)$/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  ctx.scene.enter("waScene");
});

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

    await ctx.telegram
      .sendMessage(process.env.CHANNEL_ID, title)
      .catch((e) => {});

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
