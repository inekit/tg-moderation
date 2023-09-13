var EntitySchema = require("typeorm").EntitySchema;

module.exports = new EntitySchema({
  name: "ChatRestrictions",
  tableName: "chat_restrictions",
  columns: {
    user_id: {
      type: "bigint",
      nullable: false,
      primary: true,
    },
    chat_id: {
      type: "bigint",
      nullable: false,
      primary: true,
    },
    messages_count: {
      type: "int",
      nullable: false,
      default: 0,
    },
  },
  relations: {
    chat: {
      target: "Chat",
      type: "one-to-many",
      cascade: true,
      joinColumn: true,
      onDelete: "cascade",
      onUpdate: "cascade",
    },
  },
});
