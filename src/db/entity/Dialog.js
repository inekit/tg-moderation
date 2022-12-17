var EntitySchema = require("typeorm").EntitySchema;

module.exports = new EntitySchema({
  name: "Dialog",
  tableName: "dialogs",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: true,
    },
    client_id: {
      type: "bigint",
      nullable: false,
    },
    appointment_id: {
      type: "int",
      nullable: false,
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
    appointment: {
      target: "Appointment",
      type: "one-to-many",
      cascade: true,
      joinColumn: true,
      onDelete: "cascade",
      onUpdate: "cascade",
    },
  },
});
