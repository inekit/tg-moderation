var EntitySchema = require("typeorm").EntitySchema;

module.exports = new EntitySchema({
  name: "Admin",
  tableName: "admins",
  columns: {
    user_id: {
      type: "bigint",
      primary: true,
    },
    password: {
      type: "varchar",
      nullable: true,
      length: 255,
    },
    can_update_admins: {
      type: "boolean",
      default: false,
    },
  },
  relations: {},
});
