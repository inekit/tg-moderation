const tOrmCon = require("../db/connection");

module.exports = async (id, ctx) => {
  const connection = await tOrmCon;

  const cIdObj = await connection
    .query(
      "update get_money_appointments set status = 'aprooved' where id = $1 returning customer_id, sum",
      [id]
    )
    .catch(console.log);

  const customer_id = cIdObj?.[0]?.[0]?.customer_id;
  const sum = cIdObj?.[0]?.[0]?.sum;

  console.log(id, customer_id, sum);

  if (!customer_id) return;

  await connection
    .query("update users set balance_rub = balance_rub + $2 where id = $1", [
      customer_id,
      sum,
    ])
    .catch(console.log);

  await ctx.telegram
    .sendMessage(customer_id, ctx.getTitle("APPOINTMENT_PAYED", [id, sum]))
    .catch(console.log);
};
