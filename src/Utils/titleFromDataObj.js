const tOrmCon = require("../db/connection");
const moment = require("moment");
module.exports = async (dataObj = {}, title, ctx, additionalTitle) => {
  let {
    id,
    appointment_id,
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
    pic,
    seller_id,
    customer_id,
  } = dataObj;

  departure_date = moment(departure_date)?.format("DD.MM.YYYY");
  departure_date_back = departure_date_back
    ? moment(departure_date_back)?.format("DD.MM.YYYY")
    : departure_date_back;

  appointment_id = appointment_id ?? id;

  customer_id = customer_id ?? seller_id;

  const connection = await tOrmCon;

  if (!pic) {
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

    pic =
      status === "reliable"
        ? "🟢"
        : a_count >= 5
        ? "🟡"
        : a_count >= 1
        ? "🟠"
        : a_count === 0
        ? "🔴"
        : "";
  }

  let titleSrt;
  if (title === "ENTER_FINISH_ADMIN")
    titleSrt =
      what_need === "send"
        ? ctx.getTitle("ENTER_FINISH_SEND_ADMIN", [
            appointment_id,
            pic,
            name,
            send_from,
            send_to,
            description,
            contacts,
            comment ? `\n${comment}` : " ",
          ]) + (ctx.getTitle(additionalTitle) ?? "")
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
          ]) + (ctx.getTitle(additionalTitle) ?? "");
  else if (title === "ENTER_FINISH_PUBLIC")
    titleSrt =
      what_need === "send"
        ? ctx.getTitle("ENTER_FINISH_SEND_PUBLIC", [
            appointment_id,
            pic,
            name,
            send_from,
            send_to,
            description,
            comment ? `\n${comment}` : " ",
          ])
        : ctx.getTitle("ENTER_FINISH_DELIVERY_PUBLIC", [
            appointment_id,
            pic,
            name,
            send_from,
            send_to,
            departure_date_back ? "и обратно" : " ",
            departure_date,
            departure_date_back ? ` 🛬 ${departure_date_back}` : " ",
            comment ? `\n4) ${comment}` : " ",
          ]);
  else if (title === "ENTER_FINISH")
    titleSrt =
      what_need === "send"
        ? ctx.getTitle("ENTER_FINISH_SEND", [
            pic,
            name,
            send_from,
            send_to,
            description,
            contacts,
            comment ? `\n${comment}` : " ",
          ])
        : ctx.getTitle("ENTER_FINISH_DELIVERY", [
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
  else if (title === "A_ENTER_FINISH")
    titleSrt =
      what_need === "send"
        ? ctx.getTitle("A_ENTER_FINISH_SEND", [
            pic,
            name,
            send_from,
            send_to,
            description,
            contacts,
            comment ? `\n${comment}` : " ",
          ])
        : ctx.getTitle("A_ENTER_FINISH_DELIVERY", [
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
  else if (title === "ENTER_FINISH_SUBSCRIPTION")
    titleSrt =
      what_need === "send"
        ? ctx.getTitle("ENTER_FINISH_SEND_SUBSCRIPTION", [
            appointment_id,
            pic,
            name,
            send_from,
            send_to,
            description,
            comment ? `\n${comment}` : " ",
          ])
        : ctx.getTitle("ENTER_FINISH_DELIVERY_SUBSCRIPTION", [
            appointment_id,
            pic,
            name,
            send_from,
            send_to,
            departure_date_back ? "и обратно" : " ",
            departure_date,
            departure_date_back ? ` 🛬 ${departure_date_back}` : " ",
            comment ? `\n4) ${comment}` : " ",
          ]);

  return titleSrt;
};
