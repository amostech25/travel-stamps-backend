// Express 4 does not automatically catch a rejected promise thrown inside an
// async route handler — without this wrapper, a database error (or any
// thrown error) inside an `async (req, res) => {...}` handler becomes an
// unhandled rejection instead of a normal error response. That can hang or
// drop the connection entirely, which is what makes it look like a CORS or
// network failure in the browser even though the real cause is a backend
// error. Wrapping every handler in this forwards the error to Express's
// normal error-handling middleware (see server.js), which always sends a
// proper JSON response — preserving the CORS headers already attached
// earlier in the middleware chain.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
