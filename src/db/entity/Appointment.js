const { now } = require("moment");

var EntitySchema = require("typeorm").EntitySchema;

module.exports = new EntitySchema({
  name: "Appointment",
  tableName: "appointments",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },
    status: {
      type: "enum",
      enum: ["issued", "aprooved", "rejected", "waiting"],
      nullable: false,
      default: "issued",
    },
    customer_id: {
      type: "bigint",
      nullable: false,
    },
    datetime_created: {
      type: "timestamp",
      default: () => "NOW()",
    },
    photo: {
      type: "varchar",
      length: 255,
      nullable: true,
    },
    what_need: {
      type: "enum",
      enum: ["delivery", "send"],
      nullable: false,
    },
    name: {
      type: "varchar",
      length: "50",
      nullable: "false",
    },
    contacts: {
      type: "varchar",
      length: "500",
      nullable: "false",
    },
    send_from: {
      type: "varchar",
      length: "500",
      nullable: "false",
    },
    send_to: {
      type: "varchar",
      length: "500",
      nullable: "false",
    },
    departure_date: {
      type: "date",
      nullable: "true",
      default: "now()",
    },
    departure_date_back: {
      type: "date",
      nullable: "true",
      default: "now()",
    },
    comment: {
      type: "varchar",
      length: "100",
      nullable: "true",
      default: "",
    },
    description: {
      type: "varchar",
      length: "500",
      nullable: "true",
    },
  },
  relations: {
    customer: {
      target: "User",
      type: "one-to-many",
      cascade: true,
      joinColumn: true,
      onDelete: "cascade",
      onUpdate: "cascade",
    },
  },
});
