var EntitySchema = require("typeorm").EntitySchema;

module.exports = new EntitySchema({
  name: "WhiteList",
  tableName: "white_list",
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
  },
});
