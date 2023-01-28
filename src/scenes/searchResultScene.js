const {
  CustomWizardScene,
  telegraf: { Composer, Markup },
  handlers: { FilesHandler },
} = require("telegraf-steps");
const tOrmCon = require("../db/connection");
const moment = require("moment");

const scene = new CustomWizardScene("searchResultScene").enter(async (ctx) => {
  const {
    edit,
    offset = 0,
    backScene,
    send_from,
    send_to,
    date_start,
    date_finish,
    what_need,
  } = ctx.scene.state;
  const perPage = 10;
  let keyboard;
  let title;

  ctx.scene.state.items =
    ctx.scene.state.items ??
    (await getItems(offset, perPage, {
      what_need,
      send_from,
      send_to,
      date_start,
      date_finish,
    }));

  const connection = await tOrmCon;

  const isSubscribed = !!(
    await connection
      .query(
        `select * from subscriptions where 
        client_id = $1 and send_from = $2 and send_to = $3 and date_start = $4 and date_finish = $5 and what_need = $6`,
        [
          ctx.from.id,
          send_from,
          send_to,
          moment.unix(date_start).toDate(),
          moment.unix(date_finish).toDate(),
          what_need,
        ]
      )
      .catch(async (e) => {
        console.log(e);
      })
  )?.[0];

  keyboard =
    ctx.scene.state.items?.length || offset !== 0
      ? {
          name: "search_list_keyboard",
          args: [
            ctx.scene.state.items,
            "item",
            0,
            offset,
            send_from,
            isSubscribed,
            backScene,
          ],
        }
      : {
          name: "search_no_items",
          args: [isSubscribed, backScene],
        };

  title =
    ctx.scene.state.items?.length || offset !== 0
      ? ctx.getTitle("SEARCH_RESULTS")
      : ctx.getTitle("NO_SEARCH_RESULTS");

  if (edit) return ctx.editMenu(title, keyboard);

  await ctx.replyWithKeyboard("⚙️", "main_menu_back_keyboard");
  ctx.replyWithKeyboard(title, keyboard);
});

scene.action(/^unsubscribe$/g, async (ctx) => {
  const { send_from, send_to, date_start, date_finish, what_need } =
    ctx.scene.state;

  const connection = await tOrmCon;

  connection
    .query(
      `delete from subscriptions where 
      client_id = $1 and send_from = $2 
      and send_to = $3 and date_start = $4 
      and date_finish = $5 and what_need = $6`,
      [
        ctx.from.id,
        send_from,
        send_to,
        moment.unix(date_start).toDate(),
        moment.unix(date_finish).toDate(),
        what_need,
      ]
    )
    .then(async (r) => {
      await ctx
        .answerCbQuery(ctx.getTitle("YOU_ARE_UNSUBSCRIBED"))
        .catch(console.log);

      const {
        send_from,
        send_to,
        date_start,
        date_finish,
        what_need,
        category_id,
        category_name,
        categories,
        offset,
      } = ctx.scene.state;

      ctx.scene.enter("searchResultScene", {
        edit: true,
        category_id,
        category_name,
        categories,
        offset,
        send_from,
        send_to,
        date_start,
        date_finish,
        what_need,
      });
    })
    .catch(async (e) => {
      console.log(e);
      await ctx.answerCbQuery().catch(console.log);
    });
});

scene.action(/^subscribe$/g, async (ctx) => {
  const { what_need, send_from, send_to, date_start, date_finish } =
    ctx.scene.state;

  const connection = await tOrmCon;

  connection
    .query(
      `insert into subscriptions (client_id,send_from,send_to,date_start,date_finish,what_need) values ($1,$2,$3,$4,$5,$6)`,
      [
        ctx.from.id,
        send_from,
        send_to,
        moment.unix(date_start).toDate(),
        moment.unix(date_finish).toDate(),
        what_need,
      ]
    )
    .then(async (r) => {
      await ctx
        .answerCbQuery(ctx.getTitle("YOU_ARE_SUBSCRIBED"))
        .catch(console.log);

      const { category_id, category_name, categories, offset } =
        ctx.scene.state;

      ctx.scene.enter("searchResultScene", {
        edit: true,
        category_id,
        category_name,
        categories,
        offset,
        send_from,
        send_to,
        date_start,
        date_finish,
        what_need,
      });
    })
    .catch(async (e) => {
      console.log(e);
      await ctx
        .answerCbQuery(ctx.getTitle("YOU_ARE_ALREADY_SUBSCRIBED"))
        .catch(console.log);
    });
});

scene.action(/get\_(.+)\_(.+)/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  const offset = ctx.match[2];
  const category_id = ctx.match[1];

  console.log("get", offset, category_id);

  const category_name = category_id;

  if (offset < 0) return;

  const { what_need, send_from, send_to, date_start, date_finish } =
    ctx.scene.state;

  ctx.scene.enter("searchResultScene", {
    edit: true,
    what_need,
    category_id,
    category_name,
    categories: ctx.scene.state.categories,
    offset,
    send_from,
    send_to,
    date_start,
    date_finish,
  });
});

scene.action(/^item\-([0-9]+)$/g, async (ctx) => {
  ctx.answerCbQuery().catch(console.log);

  const item_id = (ctx.scene.state.item_id = ctx.match[1]);

  const connection = await tOrmCon;

  const item = (ctx.scene.state.item = (
    await connection
      .query(`select * from appointments where id = $1`, [item_id])
      .catch((e) => {
        console.log(e);
        ctx.replyWithTitle("DB_ERROR");
      })
  )?.[0]);

  if (!ctx.scene.state.item) {
    ctx.replyWithTitle("NO_SUCH_ITEM");
    delete ctx.scene.state;
    return ctx.scene.enter("mainScene", { edit: true });
  }

  ctx.scene.state.item = item;

  const title = await require("../Utils/titleFromDataObj")(
    item,
    "ENTER_FINISH_PUBLIC",
    ctx
  );

  ctx.editMenu(title, {
    name: "search_item_keyboard",
    args: [ctx.match[1]],
  });
});

scene.action(/^soft\-dialog\-([0-9]+)$/g, async (ctx) => {
  await ctx.answerCbQuery().catch(console.log);

  const {
    offset,
    category_id,
    categories,
    category_name,
    what_need,
    send_from,
    send_to,
    date_start,
    date_finish,
  } = ctx.scene.state;

  ctx.scene.enter("dialogScene", {
    appointment_id: ctx.match[1],
    mode: "client",
    searchResultParams: {
      category_id,
      category_name,
      categories,
      offset,
      what_need,
      send_from,
      send_to,
      date_start,
      date_finish,
    },
  });
});

scene.action("go_back", (ctx) => {
  ctx.answerCbQuery().catch(console.log);

  const {
    what_need,
    send_from,
    send_to,
    date_start,
    date_finish,
    offset,
    categories,
  } = ctx.scene.state;

  ctx.scene.enter("searchResultScene", {
    edit: true,
    categories,
    offset,
    what_need,
    send_from,
    send_to,
    date_start,
    date_finish,
  });
});

scene.action("go_back_scene", (ctx) => {
  ctx.answerCbQuery().catch(console.log);

  const { backScene } = ctx.scene.state;

  ctx.scene.enter(backScene, {
    edit: true,
  });
});

async function getItems(
  offset,
  perPage,
  { send_from, send_to, date_start, date_finish, what_need }
) {
  const connection = await tOrmCon;

  console.log(
    moment.unix(date_start).format("DD.MM.YYYY"),
    moment.unix(date_finish).format("DD.MM.YYYY")
  );

  if (what_need === "delivery")
    return await connection
      .query(
        `select a.*, u.status from appointments a left join users u on customer_id = u.id
      where a.status = 'aprooved' 
      and what_need = 'delivery'
      and ( ( (send_from=$3 or $3 is null) and (send_to=$4 or $4 is null)
        and (departure_date>=$5 or $5 is null) and (departure_date<=$6 or $6 is null) )
        or ( (send_to=$3 or $3 is null) and (send_from=$4 or $4 is null)
        and (departure_date_back>=$5 or $5 is null) and (departure_date_back<=$6 or $6 is null) ) )
      order by id DESC limit $1 offset $2`,
        [
          perPage,
          offset * perPage,
          send_from,
          send_to,
          moment.unix(date_start).toDate(),
          moment.unix(date_finish).toDate(),
        ]
      )
      .catch((e) => {
        console.log(e);
      });

  return await connection
    .query(
      `select a.*, u.status from appointments a left join users u on customer_id = u.id
      where a.status = 'aprooved' 
      and what_need = 'send'
      and (send_from=$3) 
      and (send_to=$4)
      and ( 
        ((departure_date<=$5) and (departure_date_back>=$5))
        or 
        ((departure_date<=$6) and (departure_date_back>=$6)) 
        or 
        ((departure_date<=$5) and (departure_date_back>=$6)) 
        or 
        ((departure_date>=$5) and (departure_date_back<=$6)) 
      )
      order by id DESC limit $1 offset $2`,
      [
        perPage,
        offset * perPage,
        send_from,
        send_to,
        moment.unix(date_start).toDate(),
        moment.unix(date_finish).toDate(),
      ]
    )
    .catch((e) => {
      console.log(e);
    });
}

module.exports = scene;
