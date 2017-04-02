const merge = require('lodash').merge;
const Promise = require('bluebird');

const defaults = {
  reconnect: () => ({
    reconnectTries: 2,
    reconnectFactor: 2,
    reconnectInterval: 3000,
    reconnectMaxInterval: 6000
  }),
  socket: () => ({
    connectTimeoutMS: 30000,
    keepAlive: 300
  }),
  server: (socketOptions, reconnectOptions) => ({
    poolSize: 5,
    auto_reconnect: true,
    socketOptions,
    reconnectTries: reconnectOptions.reconnectTries,
    reconnectInterval: reconnectOptions.reconnectInterval
  }),
  replSet: (socketOptions, reconnectOptions) => ({
    poolSize: 5,
    socketOptions,
    reconnectTries: reconnectOptions.reconnectTries,
    reconnectInterval: reconnectOptions.reconnectInterval
  })
};

module.exports = (opt) => {
  const socketOptions = merge(defaults.socket(), opt.socket);
  const reconnectOptions = merge(defaults.reconnect(), opt.reconnect);

  const mongoose = opt.mongoose || { };
  mongoose.server = merge(defaults.server(socketOptions, reconnectOptions), mongoose.server);
  mongoose.replSet = merge(defaults.replSet(socketOptions, reconnectOptions), mongoose.replSet);
  mongoose.promiseLibrary = opt.Promise || Promise;

  return {
    mongoose,
    reconnect: reconnectOptions,
    exitOnError: opt.exitOnError || false,
    exitOnTerminate: opt.exitOnTerminate || false
  };
};
