const { Engine, telegraf } = require("telegraf-steps");
require("dotenv").config();
const fs = require("fs");
const allowed_updates = ["message", "callback_query", "chat_member"];
const TOKEN = process.env.BOT_TOKEN;
const keyboards = {
  ...require("./Keyboards/keyboards"),
  ...require("./Keyboards/inlineKeyboards"),
};
const cron = require("node-cron");
const tOrmCon = require("./db/connection");

cron.schedule("*/1 * * * *", async () => {
  const connection = await tOrmCon;
  connection
    .query(
      `delete from white_list where DATE_PART('minute', now() - creation_date)::int >=1`
    )
    .catch(console.log)
    .then((r) => console.log(1));

  connection
    .query(
      `select *,DATE_PART('minute', now() - creation_date)::int from white_list`
    )
    .catch(console.log)
    .then((r) => console.log(r));
});

const { bot, ctx, titles } = new Engine(
  TOKEN,
  __dirname + "/Titles",
  keyboards
);

global.titles = titles;

console.log("started");

(async () => {
  bot.use(telegraf.session(), require("./stages"));
  //bot.on("message", (ctx) => console.log(ctx));

  if (process.env.NODE_ENV === "production") {
    bot.catch(console.error);

    const secretPath = `/moderation`;

    console.log(secretPath);

    const tlsOptions = {
      key: fs.readFileSync("/etc/ssl/certs/rootCA.key"),
      cert: fs.readFileSync("/etc/ssl/certs/rootCA.crt"),
      ca: [fs.readFileSync("/etc/ssl/certs/rootCA.crt")],
    };

    bot.telegram
      .setWebhook(`${process.env.SERVER_URI}${secretPath}`, {
        certificate: { source: fs.readFileSync("/etc/ssl/certs/rootCA.crt") },
        allowed_updates,
        drop_pending_updates: true,
      })
      .then((r) => {
        console.log(r);
      });

    await bot.startWebhook(secretPath, null, 5000);

    console.log(await ctx.telegram.getWebhookInfo());
  } else {
    await bot.launch({
      allowedUpdates: allowed_updates,
      dropPendingUpdates: true,
    });
  }
})();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
