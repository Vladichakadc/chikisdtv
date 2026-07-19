const { AsyncLocalStorage } = require('async_hooks');

const rlsContext = new AsyncLocalStorage();

function withRLS(req, res, next) {
  rlsContext.run(new Map(), () => {
    next();
  });
}

function getRLSContext() {
  return rlsContext.getStore();
}

module.exports = { withRLS, getRLSContext };
