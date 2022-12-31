const express = require("express");
const passport = require("passport");

const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { spawnSync } = require("child_process");
const adminRouter = require("./routes/adminRoutes");
//const cron = new Cron();
var app = require("./app-preferences");
const { isObject } = require("util");
app.use(
  cors({
    origin: [
      "http://127.0.0.1:8080",
      "http://127.0.0.1:8000",
      "http://localhost:8080",
      ,
      "http://localhost:8000",
      "http://192.168.0.102:8080",
      "http://192.168.0.102:8000",
    ],
    credentials: true,
  })
);
app.use("/public", express.static("public"));

app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(passport.initialize());
app.use(passport.session());

module.exports = (ctx) => {
  app.use("/api/admin", adminRouter(ctx));

  app.use(function (req, res, next) {
    const err = new Error("Страница не найдена!");
    err.status = 404;
    next(err);
  });

  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      message: err.message,
      error: err,
    });
  });

  const host = "127.0.0.1";
  const port = process.env.PORT ?? 3000;
  let server = app.listen(port, host, () =>
    console.log(`Server listens http://${host}:${port}`)
  );

  const { Server } = require("socket.io");

  const io = new Server(server, {
    allowEIO3: true,
    cors: {
      origin: [
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://192.168.0.102:8000",
      ],
      //
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("a user connected");
  });

  io.listen(4000, () => {
    console.log("listening on *:3000");
  });

  io.on("error", (err) => {
    console.log("err", err);
  });

  global.io = io;

  //setInterval(
  //  () => io.emit("DIALOG_MESSAGE", { dialog_id: 10, text: "fu" }),
  //  1000
  //);

  //setInterval(() => io.emit("NEW_APPOINTMENT"), 1000);

  server.on("error", (err) => {
    console.log("err", err);

    const child = spawnSync("sudo", ["killall", "-9", "node"]);
    if (child.error) console.log(child.error);
  });
};
