module.exports = async ({
  dialog_id,
  text,
  photo,
  video,
  voice,
  file,
  video_note,
}) => {
  const connection = await tOrmCon;

  const { opened_client, opened_seller, appointment_id, client_id, seller_id } =
    (
      await connection
        .query(
          "select opened_client, opened_seller, appointment_id, client_id, customer_id seller_id from dialogs left join appointmnets where id = $1",
          [dialog_id]
        )
        .catch((e) => {
          console.log(e);
          ctx.replyWithTitle("DB_ERROR");
        })
    )?.[0] ?? {};

  const message = await sendToOpposite(ctx, client_id, opened_client, {
    text,
    photo,
    video,
    voice,
    file,
    video_note,
    dialog_id,
    appointment_id,
    toClient: true,
    from: "admin",
  });

  const second = await sendToOpposite(ctx, seller_id, opened_seller, {
    text,
    photo,
    video,
    voice,
    file,
    video_note,
    dialog_id,
    from: "admin",
  });

  await connection
    .query(
      `insert into messages (id, second_id, dialog_id,from_id,text, photo, video, voice,file, video_note, from_admin) 
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        message?.message_id,
        second?.message_id,
        dialog_id,
        ctx.from.id,
        text,
        photo,
        video,
        voice,
        file,
        video_note,
        true,
      ]
    )
    .then(async (res) => {
      console.log(123, appointment_id);
    })
    .catch((e) => {
      console.log(e);
      ctx.replyWithTitle("DB_ERROR");
    });
};
