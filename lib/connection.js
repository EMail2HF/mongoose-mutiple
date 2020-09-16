const util = require('util');
const muri = require('muri');
const mongoose = require('mongoose');
const retry = require('promise-retry');
const EventEmitter = require('events').EventEmitter;

const events = require('./events');
const mergeConfig = require('./mergeConfig');
const MongooseDatabase = require('./database');

const defaultDatabaseKey = '_default';

function MongooseConnection(uri, options) {
  EventEmitter.call(this);

  this.uri = uri;
  this.db = new mongoose.Mongoose();
  this.connection = this.db.connection;
  this.databases = { };
  this.options = mergeConfig(options);
  this.schemas = options.schemas || { };

  // Forward all events.
  for (let i = 0; i < events.length; i += 1) {
    this.db.connection.on(events[i], this.emit.bind(this, events[i]));
  }
}

util.inherits(MongooseConnection, EventEmitter);


MongooseConnection.prototype.addSchema = function addSchema(name,model) {

  const self = this; 

  if(self.connection){

    self.schemas[name]=model;

    return self.connection.model( name, model);

    //return self.db;
  }
  else{

    return null;
  }


}

MongooseConnection.prototype.getDb = function getDb(name) {
  const key = name || defaultDatabaseKey;

  const self = this;
  if (self.databases[key]) {
    return self.databases[key];
  }

  const database = self.databases[key] =
    new MongooseDatabase((key === defaultDatabaseKey && self.connection) || self.db.connection.useDb(key));

  // Add each schema.
  Object.keys(self.schemas).forEach((schemaName) => {
    
    database[schemaName] = database.connection.model(
      schemaName,
      //self.schemas[schemaName]
      self.schemas[schemaName].schema,
      self.schemas[schemaName].collectionName,
    );
  });

  return database;
};

MongooseConnection.prototype.getDbEx = function getDbEx(name) {
  const key = name || defaultDatabaseKey;

  const self = this;
  if (self.databases[key]) {
    return self.databases[key];
  }

  const database = self.databases[key] =
    new MongooseDatabase((key === defaultDatabaseKey && self.connection) || self.db.connection.useDb(key));

  // Add each schema.
  Object.keys(self.schemas).forEach((schemaName) => {
    
    database[schemaName] = database.connection.model(
      schemaName,
      self.schemas[schemaName]
      // self.schemas[schemaName].schema,
      // self.schemas[schemaName].collectionName,
    );
  });

  return database;
};

MongooseConnection.prototype.clearDb = function clearDb(name) {
  const key = name || defaultDatabaseKey;

  if (this.databases[key]) {
    delete this.databases[key];
  }
};

MongooseConnection.prototype.disconnect = function disconnect() {
  const self = this;
  return self.db.connection.close();
};

MongooseConnection.prototype.connectWithRetry = function connectWithRetry() {
  const self = this;
  return retry(
    {
      factor: 2,
      retries: self.options.reconnect.reconnectTries,
      minTimeout: self.options.reconnect.reconnectInterval,
      maxTimeout: self.options.reconnect.reconnectMaxInterval
    },
    (next, attemptNumber) =>
      self.db.connect(self.uri, self.options.mongoose)
        .catch((err) => {
          self.emit('reconnecting', attemptNumber, err);
          next(err);
        })
  );
};

MongooseConnection.prototype.connect = function connect() {
  const self = this;
  self.emit('connecting', muri(this.uri), self.options);

  return self.connectWithRetry()
    .then(() => {
      // If the connection keeps failing, stop the process.
      if (self.options.exitOnError) {
        self.db.connection.on('error', (err) => {
          self.emit('error-quit', err);
          process.exit(1);
        });
      }

      // If the process receives input to stop, disconnect.
      if (self.options.exitOnTerminate) {
        const quit = function quit(event) {
          self.disconnect()
            .then(() => {
              self.emit('close-quit', event);
              process.exit(0);
            });
        };
        process
          .on('SIGINT', quit.bind(null, 'SIGINT'))
          .on('SIGTERM', quit.bind(null, 'SIGINT'));
      }

      // Return the database.
      return self.db.connection;
    });
};

module.exports = MongooseConnection;
