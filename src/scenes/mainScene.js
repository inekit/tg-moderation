const e = require("express");
const {
  CustomWizardScene,
  createKeyboard,
  handlers: { FilesHandler },
  telegraf: { Markup },
} = require("telegraf-steps");
const moment = require("moment");
const tOrmCon = require("../db/connection");
const getUser = require("../Utils/getUser");
const { use } = require("../stages");
const { Composer } = require("telegraf");

const scene = new CustomWizardScene("clientScene").enter(async (ctx) => {
  const { visual = true, from_dialogs } = ctx.scene.state;
  let userObj = (ctx.scene.state.userObj = await getUser(ctx));

  const connection = await tOrmCon;

  if (!userObj) {
    const referer_id = /^ref-([0-9]+)$/g.exec(ctx.startPayload)?.[1];
    userObj = await connection
      .getRepository("User")
      .save({
        id: ctx.from.id,
        username: ctx.from.username,
        referer_id,
      })
      .catch(async (e) => {
        console.log(e);
        ctx.replyWithTitle("DB_ERROR");
      });
  }

  await connection
    .query(`update dialogs set opened_client = false where client_id = $1`, [
      ctx.from.id,
    ])
    .catch((e) => {});

  await connection
    .query(
      `update dialogs set opened_seller = false where $1 = (select customer_id from dialogs d left join appointments a on d.appointment_id = a.id where d.id = dialogs.id)`,
      [ctx.from.id]
    )
    .catch((e) => {});

  const appointment_id = /dialog\-([0-9]+)/g.exec(ctx.startPayload)?.[1];

  if (appointment_id)
    return ctx.scene.enter("dialogScene", { appointment_id, mode: "client" });

  if (from_dialogs) return getDialogs(ctx);

  console.log(userObj);

  visual && (await ctx.replyWithTitle("GREETING"));

  /*if (userObj.user_id)
    ctx.replyWithKeyboard("ENTER_NAME", "main_menu_admin_keyboard");
  else ctx.replyWithKeyboard("ENTER_NAME", "main_keyboard");*/

  ctx.replyWithKeyboard("MAIN_MENU_TITLE", {
    name: "main_keyboard",
    args: [userObj?.user_id],
  });
});

scene.hears(titles.getValues("NEW_APPOINTMENT_BUTTON"), async (ctx) => {
  ctx.replyStepByVariable("name");
});
scene.hears(titles.getValues("APPOINTMENTS_BUTTON"), async (ctx) => {
  ctx.scene.enter("userAppointmentsScene");
});
scene.hears(titles.getValues("DIALOGS_BUTTON"), async (ctx) => getDialogs(ctx));

async function getDialogs(ctx) {
  ctx.wizard?.selectStep(0);
  const connection = await tOrmCon;

  const dialogs = (ctx.scene.state.dialogs = await connection
    .query(
      `select case when customer_id = $1 then u2.username when client_id = $1 then  u.username end username, 
      (select m.text from messages m where m.from_id <>$1 and m.dialog_id = d.id order by m.id desc limit 1),
      case when customer_id = $1 then 'seller' when client_id = $1 then 'client' end role,
      d.id,
      d.appointment_id
      from dialogs d 
      left join appointments a on d.appointment_id = a.id
      left join users u on a.customer_id = u.id
      left join users u2 on d.client_id = u2.id
      where client_id = $1 or customer_id = $1`,
      [ctx.from.id]
    )
    .catch(console.log));

  ctx.replyWithKeyboard("CHOOSE_DIALOG", {
    name: "dialogs_keyboard",
    args: [dialogs],
  });
}

scene
  .addStep({
    variable: "none",
    handler: new Composer().on("text", (ctx) => {
      const text = ctx.message.text;
      const fUsername = /^\@(.+)\s\(/g.exec(text)?.[1];
      if (fUsername) {
        const dialog = ctx.scene.state.dialogs?.find(
          ({ username }) => username === fUsername
        );

        console.log(dialog);

        if (!dialog) return;

        if (dialog.role === "seller")
          return ctx.scene.enter("dialogSellerScene", {
            dialog_id: dialog.id,
            from_dialogs: true,
          });

        return ctx.scene.enter("dialogScene", {
          appointment_id: dialog.appointment_id,
          from_dialogs: true,
        });
      }
    }),
  })
  .addStep({
    variable: "name",
    confines: ["string45", "cyrillic"],
  })
  /*.addStep({
    variable: "contacts",
    skipTo: "what_need",
    skipText: "Оставить мой ник",
  })*/
  .addSelect({
    variable: "what_need",
    options: {
      "Отправить посылку": "send",
      "Могу доставить": "delivery",
    },
    cb: async (ctx) => {
      await ctx.answerCbQuery().catch((e) => {});
      ctx.scene.state.input.what_need = ctx.match[0];
      return ctx.replyNextStep();
    },
  })
  .addSelect({
    variable: "send_from",
    options: {
      "#Доха": "Доха",
      "#Дубай": "Дубай",
      "#Москва": "Москва",
      "#Стамбул": "Стамбул",
      "#Франкфурт": "Франкфурт",
      "#Тель-Авив": "ТельАвив",
      "Вписать свой вариант": "main",
    },
    cb: async (ctx) => {
      await ctx.answerCbQuery().catch((e) => {});
      if (ctx.match[0] === "main") {
        ctx.wizard.next();
        return ctx.replyWithTitle("ENTER_FROM_INPUT");
      }
      ctx.scene.state.input.send_from = ctx.match[0];
      return ctx.replyStepByVariable("send_to");
    },
  })
  .addStep({
    variable: "send_from_input",
    cb: (ctx) => {
      ctx.scene.state.input.send_from = ctx.message.text;
      ctx.replyNextStep();
    },
  })
  .addSelect({
    variable: "send_to",
    options: {
      "#Доха": "Доха",
      "#Дубай": "Дубай",
      "#Москва": "Москва",
      "#Стамбул": "Стамбул",
      "#Франкфурт": "Франкфурт",
      "#Тель-Авив": "ТельАвив",
      "Вписать свой вариант": "main",
    },
    cb: async (ctx) => {
      await ctx.answerCbQuery().catch((e) => {});

      if (ctx.match[0] === "main") {
        ctx.wizard.next();
        return ctx.replyWithTitle("ENTER_TO_INPUT");
      }

      ctx.scene.state.input.send_to = ctx.match[0];

      if (ctx.scene.state.input.what_need === "send")
        return ctx.replyStepByVariable("description");

      return ctx.replyStepByVariable("departure_date");
    },
  })
  .addStep({
    variable: "send_from_input",
    cb: (ctx) => {
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
  .addSelect({
    variable: "comment",
    confines: ["string200"],
    options: {
      Пропустить: "skip",
    },
    cb: async (ctx) => {
      await ctx.answerCbQuery().catch((e) => {});

      ctx.wizard.state.input.pic = await getPic(ctx.from.id);

      ctx.replyWithKeyboard(getSendHeader(ctx), "finish_send_keyboard");
      ctx.wizard.selectStep(ctx.wizard.cursor + 1);

      delete ctx.scene.state.editStep;
      delete ctx.scene.state.editHeaderFunc;
      delete ctx.scene.state.editKeyboard;
    },
    onInput: async (ctx) => {
      ctx.wizard.state.input.comment = ctx.message.text;
      ctx.wizard.state.input.pic = await getPic(ctx.from.id);

      ctx.replyWithKeyboard(getSendHeader(ctx), "finish_send_keyboard");
      ctx.wizard.selectStep(ctx.wizard.cursor + 1);

      delete ctx.scene.state.editStep;
      delete ctx.scene.state.editHeaderFunc;
      delete ctx.scene.state.editKeyboard;
    },
  })
  .addSelect({
    variable: "finish_send",
    options: {
      "Отправить объявление": "send",
      "Изменить поле имя": "name",
      "Изменить контакты": "contacts",
      "Изменить поле откуда": "send_from",
      "Изменить поле куда": "send_to",
      "Изменить описание": "description",
      "Изменить комментарий": "comment",
    },
    cb: async (ctx) => {
      await ctx.answerCbQuery().catch((e) => {});

      const action = ctx.match[0];

      if (action !== "send") {
        ctx.replyStepByVariable(action);
        return ctx.setEditStep(
          "finish_send",
          getSendHeader,
          "finish_send_keyboard"
        );
      }

      sendToAdmin(ctx);
    },
  })
  .addStep({
    variable: "departure_date",
    cb: (ctx) => {
      const text = ctx.message.text;
      const date = moment(text, "DD.MM.YYYY");
      if (date.isValid() && date.add(1, "days") >= moment(new Date())) {
        ctx.scene.state.input.departure_date = text;
        ctx.replyNextStep();
      } else if (date.isValid()) ctx.replyWithTitle("PAST_DATE");
      else ctx.replyWithTitle("ENTER_DEPARTURE_DATE");
    },
  })
  .addSelect({
    variable: "want_back",
    options: {
      Да: "yes",
      Нет: "no",
    },
    cb: async (ctx) => {
      await ctx.answerCbQuery().catch((e) => {});

      if (ctx.match[0] === "yes")
        return ctx.replyStepByVariable("departure_date_back");

      ctx.replyStepByVariable("files");
    },
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
      } else if (date.isValid()) ctx.replyWithTitle("PAST_DATE_BACK");
      else ctx.replyWithTitle("ENTER_DEPARTURE_DATE_BACK");
    },
  })
  .addStep({
    variable: "files",
    type: "action",
    //skipTo: "comment_delivery",
    handler: new FilesHandler(async (ctx) => {
      ctx.answerCbQuery().catch(console.log);

      ctx.replyNextStep();
    }),
  })
  .addSelect({
    variable: "comment_delivery",
    confines: ["string200"],
    options: {
      Пропустить: "skip",
    },
    cb: async (ctx) => {
      await ctx.answerCbQuery().catch((e) => {});

      ctx.wizard.state.input.pic = await getPic(ctx.from.id);

      await ctx.replyWithPhoto(ctx.scene.state.input.photos).catch((e) => {});
      ctx.replyWithKeyboard(getDeliveryHeader(ctx), "finish_delivery_keyboard");
      ctx.wizard.selectStep(ctx.wizard.cursor + 1);

      delete ctx.scene.state.editStep;
      delete ctx.scene.state.editHeaderFunc;
      delete ctx.scene.state.editKeyboard;
    },
    onInput: async (ctx) => {
      ctx.wizard.state.input.comment = ctx.message.text;
      ctx.wizard.state.input.pic = await getPic(ctx.from.id);

      await ctx.replyWithPhoto(ctx.scene.state.input.photos).catch((e) => {});
      ctx.replyWithKeyboard(getDeliveryHeader(ctx), "finish_delivery_keyboard");
      ctx.wizard.selectStep(ctx.wizard.cursor + 1);

      delete ctx.scene.state.editStep;
      delete ctx.scene.state.editHeaderFunc;
      delete ctx.scene.state.editKeyboard;
    },
  })
  .addSelect({
    variable: "finish_delivery",
    options: {
      "Отправить объявление": "send",
      "Изменить поле имя": "name",
      "Изменить контакты": "contacts",
      "Изменить поле откуда": "send_from",
      "Изменить поле куда": "send_to",
      "Изменить дату отправления": "departure_date",
      "Изменить дату возвращения": "departure_date_back",
      "Изменить комментарий": "comment_delivery",
    },
    cb: async (ctx) => {
      await ctx.answerCbQuery().catch((e) => {});

      const action = ctx.match[0];

      if (action !== "send") {
        ctx.replyStepByVariable(action);
        return ctx.setEditStep(
          "finish_delivery",
          getDeliveryHeader,
          "finish_delivery_keyboard"
        );
      }

      sendToAdmin(ctx);
    },
  });

async function getPic(customer_id) {
  const connection = await tOrmCon;

  const status = (
    await connection
      .query("select status from users where id = $1 limit 1", [customer_id])
      .catch(console.log)
  )?.[0]?.status;

  const a_count = (
    await connection
      .query(
        "select count(*) a_count from appointments where status = 'aprooved' and customer_id = $1",
        [customer_id]
      )
      .catch((e) => {
        console.log(e);
      })
  )?.[0]?.a_count;

  return status === "reliable"
    ? "🟢"
    : a_count >= 5
    ? "🟡"
    : a_count >= 1
    ? "🟠"
    : a_count === 0
    ? "🔴"
    : "";
}

function getSendHeader(ctx) {
  const {
    what_need,
    name,
    contacts,
    send_from,
    send_to,
    description,
    comment,
    pic,
  } = ctx.wizard.state.input;
  return ctx.getTitle("ENTER_FINISH_SEND", [
    pic,
    name,
    send_from,
    send_to,
    description,
    contacts ?? `@${ctx.from.username}`,
    comment ? `\n${comment}` : " ",
  ]);
}

function getDeliveryHeader(ctx) {
  const {
    what_need,
    name,
    contacts,
    send_from,
    send_to,
    departure_date,
    departure_date_back,
    comment,
    pic,
  } = ctx.wizard.state.input;

  ctx.replyWithPhoto(ctx.scene.state.input.photos).catch((e) => {});

  return ctx.getTitle("ENTER_FINISH_DELIVERY", [
    pic,
    name,
    send_from,
    send_to,
    departure_date_back ? "и обратно" : " ",
    departure_date,
    departure_date_back ? ` 🛬 ${departure_date_back}` : " ",
    contacts ?? `@${ctx.from.username}`,
    comment ? `\n5) ${comment}` : " ",
  ]);
}

async function sendToAdmin(ctx) {
  let {
    what_need,
    name,
    contacts,
    send_from,
    send_to,
    departure_date,
    departure_date_back,
    comment_delivery,
    comment,
    files,
    photos,
    description,
  } = ctx.wizard.state.input;

  //console.log(ctx.wizard.state);

  contacts = contacts ?? `@${ctx.from.username}`;

  const connection = await tOrmCon;

  connection
    .getRepository("Appointment")
    .save({
      what_need,
      name,
      contacts,
      send_from,
      send_to,
      departure_date,
      departure_date_back,
      comment,
      description,
      photo: photos,
      customer_id: ctx.from.id,
    })
    .then(async (res) => {
      console.log(res);
      ctx.scene.state.sent = true;

      io.emit("NEW_APPOINTMENT");

      ctx.replyWithKeyboard("APPOINTMENT_SENT", "new_appointment_keyboard");

      const admins = await connection.getRepository("Admin").find();
      for (admin of admins) {
        const title = await require("../Utils/titleFromDataObj")(
          ctx.scene.state.input,
          "A_ENTER_FINISH",
          ctx
        );
        ctx.telegram.sendMessage(admin.user_id, title);
      }
    })
    .catch(async (e) => {
      console.log(e);
      ctx.replyWithTitle("DB_ERROR");
    });
}

scene.action("new_appointment", async (ctx) => {
  await ctx.answerCbQuery().catch((e) => {});
  //ctx.scene.enter("clientScene", { visual: false });
  ctx.replyStepByVariable("name");
});

module.exports = [scene];
