var EntitySchema = require("typeorm").EntitySchema;

module.exports = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      primary: true,
      type: "bigint",
    },
    username: {
      type: "varchar",
      length: 255,
      nullable: true,
    },
    last_use: {
      type: "date",
      nullable: true,
    },
    balance_rub: {
      type: "int",
      nullable: false,
      default: 0,
    },
    total_income_referal: {
      type: "int",
      nullable: false,
      default: 0,
    },
    test_url_used: {
      type: "boolean",
      nullable: false,
      default: false,
    },
    referer_id: {
      type: "bigint",
      nullable: true,
    },
    status: {
      type: "enum",
      enum: ["newbie", "user", "regular", "reliable", "restricted"],
      nullable: false,
      default: "newbie",
    },
  },
  relations: {
    referer: {
      target: "User",
      type: "one-to-many",
      cascade: true,
      joinColumn: true,
      onDelete: "set null",
      onUpdate: "cascade",
    },
  },
});
