const axios = require("axios");
const https = require("https");

const instance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

module.exports = class OutlineManager {
  constructor(serverApi) {
    this.serverApi = serverApi;
  }
  getUsers() {
    return new Promise((res, rej) => {
      instance
        .get(`${this.serverApi}/access-keys/`)
        .then(function (response) {
          res(response?.data);
        })
        .catch(function (error) {
          rej(error);
        });
    });
  }
  addUser() {
    return new Promise((res, rej) => {
      instance
        .post(`${this.serverApi}/access-keys/`)
        .then(function (response) {
          res(response?.data);
        })
        .catch(function (error) {
          rej(error);
        });
    });
  }
  deleteUser(id) {
    return new Promise((res, rej) => {
      instance
        .delete(`${this.serverApi}/access-keys/${id}/`)
        .then(function (response) {
          res(response?.data);
        })
        .catch(function (error) {
          rej(error);
        });
    });
  }
};
