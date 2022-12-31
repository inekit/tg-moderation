const servicePreset = require("../services/crud.service").getService("Dialog", [
  "client_id",
  "appointment_id",
]);
const { getAll: gAD } = require("../services/dialogs.service");

async function getAll(req, res, next) {
  gAD(Object.assign(req.query))
    .then((data) => res.send(data))
    .catch((error) => next(error));
}

function getOne(req, res) {
  servicePreset
    .get(req.query.id, 1, 1)
    .then((data) => res.send(data))
    .catch((error) => next(error));
}

function addOne(req, res) {
  const { name, description } = req.body;

  servicePreset
    .add(req.body)
    .then((data) => res.send(data))
    .catch((error) => next(error));
}

async function editOne(req, res, next) {
  editPost(Object.assign(req.body, { previewBinary: req.files?.image }))
    .then((data) => res.send(data))
    .catch((error) => next(error));
}

function deleteOne(req, res) {
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
