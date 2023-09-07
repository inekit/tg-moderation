var EntitySchema = require("typeorm").EntitySchema;

module.exports = new EntitySchema({
  name: "ChatAbilities",
  tableName: "chat_abilities",
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
    last_message_datetime: {
      type: "timestamp",
      nullable: true,
    },
  },
  relations: {
    user: {
      target: "WhiteList",
      type: "one-to-many",
      cascade: true,
      joinColumn: true,
      onDelete: "cascade",
      onUpdate: "cascade",
    },
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
