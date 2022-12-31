const errorLogger = (err, req, res, next) => {
  console.error('\x1b[31m', err);
  next(err);
};

const errorResponder = (err, req, res, next) => {
  res.header('Content-Type', 'application/json');
  if (!err?.statusCode) next();
  res.status(err?.statusCode).send(JSON.stringify(err, null, 4));
};

function failSafeHandler(err, req, res, next) {
  res.status(500).send(err);
}

const invalidPathHandler = (req, res, next) => {
  res.redirect('/error');
};

module.exports = { errorLogger, errorResponder, invalidPathHandler, failSafeHandler };
