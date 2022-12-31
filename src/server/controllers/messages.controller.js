const servicePreset = require("../services/crud.service").getService(
  "Message",
  ["dialog_id"]
);
const { getAll: gAM, addOne: aO } = require("../services/messages.service");

function getAll(ctx) {
  return (req, res, next) => {
    gAM(Object.assign(req.query), ctx)
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

function addOne(ctx) {
  return (req, res, next) => {
    const { name, description } = req.body;

    aO(req.body, ctx)
      .then((data) => res.send(data))
      .catch((error) => next(error));
  };
}

async function editOne(req, res, next) {
  editPost(Object.assign(req.body, { previewBinary: req.files?.image }))
    .then((data) => res.send(data))
    .catch((error) => next(error));
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
};
