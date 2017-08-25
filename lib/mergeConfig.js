const defaults = require('lodash').defaults;
const Promise = require('bluebird');

const defaultConfig = {
  reconnect: () => ({
    reconnectTries: 2,
    reconnectFactor: 2,
    reconnectInterval: 3000,
    reconnectMaxInterval: 6000
  }),
  server: reconnectOptions => ({
    poolSize: 5,
    autoReconnect: true,
    connectTimeoutMS: 30000,
    keepAlive: 300,
    reconnectTries: reconnectOptions.reconnectTries,
    reconnectInterval: reconnectOptions.reconnectInterval
  })
};

module.exports = (opt) => {
  const reconnectOptions = defaults(opt.reconnect || { }, defaultConfig.reconnect());

  const mongooseOptions = defaults(opt.mongoose || { }, defaultConfig.server(reconnectOptions));
  mongooseOptions.promiseLibrary = opt.Promise || Promise;

  return {
    mongoose: mongooseOptions,
    reconnect: reconnectOptions,
    exitOnError: opt.exitOnError || false,
    exitOnTerminate: opt.exitOnTerminate || false
  };
};
