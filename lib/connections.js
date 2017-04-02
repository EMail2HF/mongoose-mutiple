const MongooseConnection = require('./connection');

function MongooseConnections(options) {
  this.options = options;
  this.connections = { };
}

MongooseConnections.prototype.add = function addConnection(name, uri, options) {
  const connection = this.connections[name] = new MongooseConnection(uri, options || this.options);
  return connection;
};

MongooseConnections.prototype.get = function getConnection(name) {
  return this.connections[name];
};

module.exports = MongooseConnections;
