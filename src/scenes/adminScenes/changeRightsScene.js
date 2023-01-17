const { CustomWizardScene } = require("telegraf-steps");
tOrmCon = require("../../db/connection");

const scene = new CustomWizardScene("changeRightsScene")
  .enter(async (ctx) => {
    const { edit, offset = 0, text } = ctx.scene.state;

    if (text) return searchByKey(ctx, text);

    const title = "ENTER_USERNAME";

    if (edit) return ctx.editMenu(title);

    await ctx.replyWithKeyboard("⚙️", "admin_back_keyboard");
    ctx.replyWithTitle(title);
  })
  .addStep({
    variable: "key",
    cb: async (ctx) => {
      searchByKey(ctx, ctx.message.text);
    },
  });

async function searchByKey(ctx, text) {
  const test = /^(.+)$/g;

  const key = test.exec(text)?.[1];

  console.log(key);

  if (!key) return ctx.replyWithTitle("WRONG_KEY");

  const connection = await tOrmCon;

  let user = (ctx.scene.state.user = (
    await connection
      .query(`select * from users u where lower(u.username) = lower($1)`, [key])
      .catch((e) => {})
  )?.[0]);

  if (!user) return ctx.replyWithTitle("NO_SUCH_USER");

  const pic =
    user.status === "reliable"
      ? "🟢"
      : user.status === "regular"
      ? "🟡"
      : user.status === "user"
      ? "🟠"
      : user.status === "newbie"
      ? "🔴"
      : "БАН";

  ctx.replyWithKeyboard(
    "CHOOSE_USER_ACTION",
    {
      name: "user_actions_keyboard",
      args: [user.id],
    },
    [user.id, user.username, pic]
  );
}

scene.action(/status\_(.+)\_(.+)/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  const id = ctx.match[2];
  let status = ctx.match[1];

  const connection = await tOrmCon;

  if (status === "count") {
    const a_count = (
      await connection.query(
        "select count(*) a_count from appointments where status = 'aprooved' and customer_id = $1",
        [id]
      )
    )?.[0]?.a_count;

    status = a_count >= 5 ? "regular" : a_count >= 1 ? "user" : "newbie";
  }

  let user = (ctx.scene.state.user = (
    await connection
      .query(
        `update users set status = $1 where id = $2 returning id, username, status`,
        [status, id]
      )
      .catch((e) => {})
  )?.[0]?.[0]);

  console.log(user);

  const pic =
    user.status === "reliable"
      ? "🟢"
      : user.status === "regular"
      ? "🟡"
      : user.status === "user"
      ? "🟠"
      : user.status === "newbie"
      ? "🔴"
      : "БАН";

  ctx.editMenu(
    "CHOOSE_USER_ACTION",
    {
      name: "user_actions_keyboard",
      args: [user.id],
    },
    [user.id, user.username, pic]
  );
});

module.exports = scene;
