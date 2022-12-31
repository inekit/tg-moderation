module.exports = async (
  ctx,
  to,
  isDialogOpened,
  {
    text,
    photo,
    video,
    voice,
    file,
    video_note,
    dialog_id,
    appointment_id,
    from,
    toClient,
  },
  hideFromCaption
) => {
  console.log(
    text,
    photo,
    video,
    voice,
    file,
    video_note,
    dialog_id,
    appointment_id
  );
  let message;

  const t = from
    ? "@" + from
    : ctx.from.username
    ? "@" + ctx.from.username
    : ctx.from.id;

  const title_dialog = hideFromCaption
    ? undefined
    : ctx.getTitle("DIALOG_MESSAGE", [t, text ?? ""]);

  const title_no_dialog = ctx.getTitle("NO_DIALOG_MESSAGE", [t, text ?? ""]);

  let extra;
  if (toClient)
    extra = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "К диалогу",
              callback_data: `dialog-client-${appointment_id}`,
            },
          ],
        ],
      },
    };
  else
    extra = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "К диалогу", callback_data: `dialog-${dialog_id}` }],
        ],
      },
    };

  let command = photo
    ? "sendPhoto"
    : video
    ? "sendVideo"
    : file
    ? "sendDocument"
    : voice
    ? "sendVoice"
    : video_note
    ? "sendVideoNote"
    : "sendMessage";

  const object = photo ?? video ?? file ?? voice ?? video_note;

  if (object) {
    if (isDialogOpened)
      message = await ctx.telegram[command](to, object, {
        caption: title_dialog,
      });
    else
      message = await ctx.telegram[command](
        to,
        object,
        Object.assign({ caption: title_no_dialog }, extra)
      );
  } else {
    if (isDialogOpened)
      message = await ctx.telegram.sendMessage(to, title_dialog);
    else message = await ctx.telegram.sendMessage(to, title_no_dialog, extra);
  }

  return message;
};
