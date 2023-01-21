const servicePreset = require("../services/crud.service").getService(
  "Appointment",
  ["customer_id", "what_need", "name", "contacts", "send_from", "send_to"]
);
const {
  getAll: gAP,
  getFilteredAddr,
} = require("../services/appointments.service");
const publishPost = require("../../Utils/publishPost");
function getAll(ctx) {
  return async (req, res, next) => {
    gAP(Object.assign(req.query), ctx)
      .then((data) => res.send(data))
      .catch((error) => next(error));
  };
}

function getOne(req, res, next) {
  servicePreset
    .get(req.query.id, 1, 1)
    .then((data) => res.send(data))
    .catch((error) => next(error));
}

function getFiltered(ctx) {
  return async (req, res, next) => {
    getFilteredAddr(req.query, ctx)
      .then((data) => res.send("true"))
      .catch((error) => next(error));
  };
}

function addOne(req, res, next) {
  const { name, description } = req.body;

  servicePreset
    .add(req.body)
    .then((data) => res.send(data))
    .catch((error) => next(error));
}

function editOne(ctx) {
  return async (req, res, next) => {
    if (req.body.status === "aprooved")
      return await publishPost(req.body.id, ctx)
        .then(() => {
          servicePreset
            .edit(req.body)
            .then((data) => res.send(data))
            .catch((error) => next(error));
        })
        .catch((error) => next(error));
    servicePreset
      .edit(req.body)
      .then((data) => res.send(data))
      .catch((error) => next(error));
  };
}

function deleteOne(req, res, next) {
  servicePreset
    .delete(req.body.id, "id")
    .then((data) => res.send(data))
    .catch((error) => next(error));
}

module.exports = {
  getAll,
  getOne,
  addOne,
  editOne,
  deleteOne,
  getFiltered,
};
