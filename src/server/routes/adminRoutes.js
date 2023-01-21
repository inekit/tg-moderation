var express = require("express");
var router = express.Router();
var {
  login,
  register,
  authAdmin: auth,
} = require("../controllers/user.authentication");
var MessagesController = require("../controllers/messages.controller");
var DialogsController = require("../controllers/dialogs.controller");
var AppointmentsController = require("../controllers/appointments.controller");

var fileUpload = require("express-fileupload");
router.use(fileUpload({}));

module.exports = (ctx) => {
  router.get("/appointments", auth, AppointmentsController.getAll(ctx));

  //router.post("/appointments", auth, AppointmentsController.addOne);

  router.put("/appointments", auth, AppointmentsController.editOne(ctx));

  //router.delete("/appointments", auth, AppointmentsController.deleteOne);

  router.get("/dialogs", auth, DialogsController.getAll);

  //router.post("/dialogs", auth, DialogsController.addOne);

  //router.put("/dialogs", auth, DialogsController.editOne);

  //router.delete("/dialogs", auth, DialogsController.deleteOne);

  router.get("/messages", auth, MessagesController.getAll(ctx));

  router.post("/messages", auth, MessagesController.addOne(ctx));

  //router.put("/messages", auth, MessagesController.editOne);

  //router.delete("/messages", auth, MessagesController.deleteOne);

  router.post("/login", login.local);

  router.post("/register", register.local);

  router.get("/logout", auth, (req, res) => {
    req.logOut();
    return res.send(JSON.stringify({ isAuthenticated: req.isAuthenticated() }));
  });

  router.get("/filter", AppointmentsController.getFiltered(ctx));

  return router;
};
