require("dotenv").config();
const qiwi = require("../qiwi/qiwi");

async function customTransactMiddleware(address, sum, type) {
  return new Promise((res, rej) => {
    const token = process.env.QIWI_TOKEN;

    if (!token) rej("no token");

    if (!address || !sum || !type) rej("no input");

    qiwi
      .transactToAnywhere(token, address, sum, type)
      .then((status) => {
        console.log(status);
        res(status);
      })
      .catch((err) => {
        console.log(err);
        rej(err);
      });
  });
}

module.exports = {
  customTransactMiddleware,
};
