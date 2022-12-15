const { Composer } = require("telegraf");

class FilesHandler extends Composer {
  constructor(confirmCb) {
    super();

    this.on("photo", (ctx) => inputFile(ctx, "photo"));

    this.action("skip", async (ctx) => confirmCb(ctx));
  }
}

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

  //if (!ctx.scene.state.input?.[type+"s"]) ctx.scene.state.input[type+"s"] = []

  //ctx.wizard.state.input?.[type+"s"].push(file_id)

  ctx.wizard.state.input[type] = file_id;
  ctx.replyWithKeyboard("CONFIRM_FILE", {
    name: "custom_keyboard",
    args: [["CONFIRM"], ["skip"]],
  });
}

module.exports = FilesHandler;
