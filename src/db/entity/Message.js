var EntitySchema = require("typeorm").EntitySchema;

module.exports = new EntitySchema({
  name: "Message",
  tableName: "messages",
  columns: {
    id: {
      type: "bigint",
      primary: true,
      generated: true,
    },
    second_id: {
      type: "bigint",
      nullable: true,
    },
    dialog_id: {
      type: "int",
      nullable: false,
    },
    from_id: {
      type: "bigint",
      nullable: true,
    },
    from_admin: {
      type: "boolean",
      nullable: false,
      default: false,
    },
    text: {
      type: "varchar",
      length: 10000,
      nullable: true,
    },
    photo: {
      type: "varchar",
      length: 255,
      nullable: true,
    },
    video: {
      type: "varchar",
      length: 255,
      nullable: true,
    },
    voice: {
      type: "varchar",
      length: 255,
      nullable: true,
    },
    file: {
      type: "varchar",
      length: 255,
      nullable: true,
    },
    video_note: {
      type: "varchar",
      length: 255,
      nullable: true,
    },
  },
  relations: {
    from: {
      target: "User",
      type: "one-to-many",
      cascade: true,
      joinColumn: true,
      onDelete: "cascade",
      onUpdate: "cascade",
    },
    dialog: {
      target: "Dialog",
      type: "one-to-many",
      cascade: true,
      joinColumn: true,
      onDelete: "cascade",
      onUpdate: "cascade",
    },
  },
});
