var EntitySchema = require("typeorm").EntitySchema;

module.exports = new EntitySchema({
  name: "Admin",
  tableName: "admins",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: true,
    },
    dialog_id: {
      type: "int",
      nullable: false,
    },
    from_id: {
      type: "bigint",
      nullable: false,
    },
    text: {
      type: "varchar",
      length: 10000,
      nullable: true,
    },
    photo: {
      type: "varchar",
      length: 10000,
      nullable: true,
    },
    video: {
      type: "varchar",
      length: 10000,
      nullable: true,
    },
    voice: {
      type: "varchar",
      length: 10000,
      nullable: true,
    },
    video_note: {
      type: "varchar",
      length: 10000,
      nullable: true,
    },
  },
  relations: {
    user: {
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
