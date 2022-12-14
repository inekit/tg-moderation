const e = require("express");
const {
  CustomWizardScene,
  createKeyboard,
  handlers: { FilesHandler },
  telegraf: { Markup },
} = require("telegraf-steps");
const titles = require("telegraf-steps").titlesGetter(__dirname + "/../Titles");
const moment = require("moment");
const dateFormats = ["D.MMMM.YYYY", "DD.MM.YY", "DD.MM.YYYY", "DD.MM.YYYY"];
const tOrmCon = require("../db/connection");
const getUser = require("../Utils/getUser");

const scene = new CustomWizardScene("clientScene").enter(async (ctx) => {
  const { visual = true } = ctx.scene.state;
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

  console.log(userObj);

  await ctx.replyWithTitle("GREETING");

  if (userObj.user_id)
    ctx.replyWithKeyboard("ENTER_NAME", "main_menu_admin_keyboard");
  else ctx.replyWithKeyboard("ENTER_NAME", "main_keyboard");
});

scene
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
  .addSelect({
    variable: "comment",
    confines: ["string200"],
    options: {
      Пропустить: "skip",
    },
    cb: async (ctx) => {
      await ctx.answerCbQuery().catch((e) => {});

      ctx.replyWithKeyboard(getSendHeader(ctx), "finish_send_keyboard");
      ctx.wizard.selectStep(ctx.wizard.cursor + 1);

      delete ctx.scene.state.editStep;
      delete ctx.scene.state.editHeaderFunc;
      delete ctx.scene.state.editKeyboard;
    },
    onInput: (ctx) => {
      ctx.wizard.state.input.comment = ctx.message.text;
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
    confines: [
      (text) => {
        const date = moment(text, "DD.MM.YYYY");
        return date.isValid();
      },
    ],
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
    confines: [
      (text) => {
        const date = moment(text, "DD.MM.YYYY");
        return date.isValid();
      },
    ],
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

      ctx.replyWithKeyboard(getDeliveryHeader(ctx), "finish_delivery_keyboard");
      ctx.wizard.selectStep(ctx.wizard.cursor + 1);

      delete ctx.scene.state.editStep;
      delete ctx.scene.state.editHeaderFunc;
      delete ctx.scene.state.editKeyboard;
    },
    onInput: (ctx) => {
      ctx.wizard.state.input.comment = ctx.message.text;
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

function getSendHeader(ctx) {
  const {
    what_need,
    name,
    contacts,
    send_from,
    send_to,
    description,
    comment,
  } = ctx.wizard.state.input;
  return ctx.getTitle("ENTER_FINISH_SEND", [
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
  } = ctx.wizard.state.input;
  return ctx.getTitle("ENTER_FINISH_DELIVERY", [
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

      ctx.replyWithTitle("APPOINTMENT_SENT");

      const admins = await connection.getRepository("Admin").find();
      for (admin of admins) {
        ctx.telegram.sendMessage(
          admin.user_id,
          what_need === "send"
            ? ctx.getTitle("A_ENTER_FINISH_SEND", [
                name,
                send_from,
                send_to,
                description,
                contacts,
                comment ? `\n${comment}` : " ",
              ])
            : ctx.getTitle("A_ENTER_FINISH_DELIVERY", [
                name,
                send_from,
                send_to,
                departure_date_back ? "и обратно" : " ",
                departure_date,
                departure_date_back ? ` 🛬 ${departure_date_back}` : " ",
                contacts,
                comment ? `\n5) ${comment}` : " ",
              ])
        );
      }
    })
    .catch(async (e) => {
      console.log(e);
      ctx.replyWithTitle("DB_ERROR");
    });
}

module.exports = [scene];
