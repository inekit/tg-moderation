var EntitySchema = require("typeorm").EntitySchema;

module.exports = new EntitySchema({
  name: "Chat",
  tableName: "chats",
  columns: {
    id: {
      primary: true,
      type: "bigint",
    },
  },
  relations: {},
});
