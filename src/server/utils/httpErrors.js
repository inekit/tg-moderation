class HttpError extends Error {
  constructor(message, statusCode, type) {
    super();
    this.message = message;
    this.statusCode = statusCode;
    this.type = type;
  }
}

class MySqlError extends HttpError {
  constructor(error) {
    super();
    this.statusCode = 500;
    this.message = error.message;
    this.type = 'MySqlError';
    this.mySqlCode = error.code;
  }
}

class NotFoundError extends HttpError {
  constructor() {
    super();
    this.message = 'No data found by query';
    this.statusCode = 404;
    this.type = 'NotFoundError';
  }
}

class NoInputDataError extends HttpError {
  constructor(inputData) {
    super();
    this.message = 'Not enough input data found';
    this.inputData = NoInputDataError;
    this.statusCode = 404;
    this.type = 'NoInputDataError';
  }
}

module.exports = { HttpError, MySqlError, NotFoundError, NoInputDataError };
