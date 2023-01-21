var EntitySchema = require("typeorm").EntitySchema;

module.exports = new EntitySchema({
  name: "Subscription",
  tableName: "subscriptions",
  columns: {
    client_id: {
      type: "bigint",
      primary: true,
      nullable: false,
    },
    send_from: {
      type: "varchar",
      length: 255,
      primary: true,
      nullable: false,
    },
    send_to: {
      type: "varchar",
      length: 255,
      primary: true,
      nullable: false,
    },
    date_start: {
      type: "date",
      primary: true,
      nullable: false,
    },
    date_finish: {
      type: "date",
      primary: true,
      nullable: false,
    },
    notified: {
      type: "boolean",
      nullable: false,
      default: false,
    },
  },
  relations: {
    client: {
      target: "User",
      type: "one-to-many",
      cascade: true,
      joinColumn: true,
      onDelete: "cascade",
      onUpdate: "cascade",
    },
  },
});
