[![NPM version](https://badge.fury.io/js/mongoose-plug.svg)](http://badge.fury.io/js/mongoose-plug) mongoose-plug
======================

**mongoose-plug** aims at making it easier to interact with connections and databases when using [mongoose](https://www.npmjs.com/package/mongoose).

Features included:

 - Retries for the initial connection
 - Support for stopping the current process when errors occurred
 - Support for closing the connection when a termination signal is received
 - Support for multiple connections
 - Support for multiple databases in the same connection
 - Easy reuse of settings/schemas over different connections/databases

## Creating a connection

```js
const MongooseConnection = require('mongoose-plug').MongooseConnection;

// Setup the connection
const connection = new MongooseConnection('mongodb://localhost:28017/temp', {
  exitOnError: true,
  exitOnTerminate: true
});

connection.connect()
  .then(() => {
    const User = connection.db.model('users', new Schema({
      name: {
        type: String,
        unique: true
      },
      email: String,
      password: String
    }));
    User.find({ })
      .then(users => {
        console.log('All users:', users);
      });
  })
  .catch((err) => {
    logger.error(err, 'An error occurred while connecting!')
  });
```

## Adding schemas to your database

The options object also allows you to provide schemas. These will then be made available as properties in the database.

```js
const MongooseConnection = require('mongoose-plug').MongooseConnection;

const connection = new MongooseConnection('mongodb://localhost:28017/temp', {
  exitOnError: true,
  exitOnTerminate: true,
  schemas: {
    users: new Schema({
      name: {
        type: String,
        unique: true
      },
      email: String,
      password: String
    })
  }
});

connection.connect()
  .then(() => {
    const db = connection.use();
    return db.users.find({ }).exec()
      .then((users) => {
        console.log(users);
      });
  })
  .catch((err) => {
    logger.error(err, 'An error occurred while connecting!')
  });
```

## Creating multiple connections

The `MongooseConnections` class allows you to add and cache multiple connections.

```js
const MongooseConnections = require('mongoose-plug').MongooseConnections;

const pool = new MongooseConnections({
  exitOnError: true,
  exitOnTerminate: true,
  schemas: {
    users: new Schema({
      name: {
        type: String,
        unique: true
      },
      email: String,
      password: String
    })
  }
});

// Add a connection to the pool.
pool.add('tenants', 'mongodb://localhost:28017/tenants')
  .connect();

// Get the database and query.
const User = pool.get('tenants').db.model('users', new Schema({
  name: {
    type: String,
    unique: true
  },
  email: String,
  password: String
}));

User.find({ })
  .then(users => {
    console.log('All users:', users);
  });

// I can provide custom options when adding a connection.
pool.add('configuration', 'mongodb://localhost:28017/config', {
  exitOnError: true,
  exitOnTerminate: true,
  schemas: {
    settings: new Schema({
      name: {
        type: String,
        unique: true
      },
      value: String
    })
  }
});
```

## Connecting to a different database in the for the same connection

In a multi-tenancy scenario you might want to use multiple databases that are part of the same cluster. This can be achieved by using [useDb](http://mongoosejs.com/docs/api.html#drivers_node-mongodb-native_connection_NativeConnection-useDb) in mongoose.

```js
const tenant = connection.use('tenant-01');
tenant.users.find({ }).exec()
  .then((users) => {
    console.log('Users for tenant-01:', users);

    // If I no longer need this database, I can just unset it (this will clear the cache);
    connection.unset(tenant);
  })
```

## Logging

The `MongooseConnection` class exposes the default events and adds a few additional ones for retries and process termination. You can listen for these events to log connection status changes:

```js
const pino = require('pino');
const MongooseConnection = require('mongoose-plug').MongooseConnection;

const logger = pino({ prettyPrint: true, name: 'mongo', level: 'debug', safe: true });

// Setup the connection
const connection = new MongooseConnection('mongodb://localhost:28017/temp', {
  exitOnError: true,
  exitOnTerminate: true
});
connection.on('connecting', (connectionSettings, options) => {
  logger.debug({ connection: pick(connectionSettings, [ 'db', 'hosts' ]), options }, 'Connecting to database...');
});
connection.on('connected', () => {
  logger.debug('Connection to the database has been established.');
});
connection.on('open', () => {
  logger.info('Connection to the database is now open.');
});
connection.on('reconnecting', (attempt, err) => {
  logger.info(err, `Reconnecting to database (attempt ${attempt}).`)
});
connection.on('reconnected', () => {
  logger.info('Reconnected to database.');
});
connection.on('disconnected', () => {
  logger.warn('Disconnected from database.');
});
connection.on('close', () => {
  logger.warn(`Connection to the database has been closed.`)
});
connection.on('close-quit', (signal) => {
  logger.info(`Connection to the database has been closed because of termination signal. Exiting process...`)
});
connection.on('error', (err) => {
  logger.error(err, 'Error connecting to the database.')
});
connection.on('error-quit', (err) => {
  logger.error(err, 'Error connecting to the database. Exiting process...')
});

connection.connect()
  .then(() => {
    logger.info('Connection is ready to be used!')
  })
  .catch((err) => {
    logger.error(err, 'An error occurred while connecting!')
  });
```

## Schema Helper

A schema helper is also available which turns objects into Mongoose schemas.

```js
const MongooseSchema = require('mongoose-plug').MongooseSchema;
const MongooseConnection = require('mongoose-plug').MongooseConnection;

const connection = new MongooseConnection('mongodb://localhost:28017/temp', {
  schemas: {
    customers: MongooseSchema({
      fields: {
        name: {
          type: String,
          required: true
        }
      },
      indexes: [
        {
          fields: { name: 1 },
          options: { name: 'unique_customer', unique: true }
        }
      ],
      options: {
        timestamps: true
      },
      statics: {
        create(payload) {
          return new this(payload).save();
        },
        findAll() {
          return this.find({ }).exec();
        }
      }
    })
  }
});

connection.connect()
  .then(() => {
    const db = connection.use();
    db.customers.create({ name: 'customer-1' })
      .then(console.log)
      .catch(console.log);
  });
```

## Configuration

The configuration object allows you to specify the following settings:

  - `exitOnError`: Stop the process if an error occurs with the MongoDB connection.
  - `exitOnTerminate`: Close the connection to MongoDB and exit the process if we get a termination signal.
  - `reconnect`: Object to configure the reconnection settings.
    - `reconnectTries`: Number of retries.
    - `reconnectInterval`: Minimum time to wait between retries.
    - `reconnectMaxInterval`: Maximum time to wait between retries (only used for the intial connection).
    - `reconnectFactor`: Backoff retry configuration. Times to multiple the `reconnectInterval` upon every retry (only used for the intial connection).
  - `socket`: Default socket settings. These will be applied to the mongoose `server` and `replSet` options.
  - `mongoose`: The configuration object for mongoose.
  - `schemas`: The schemas which should be attached to each database.

Example:

```js
{
  exitOnError: true,
  exitOnTerminate: true,
  reconnect: {
    reconnectTries: 3,
    reconnectInterval: 3000,
    reconnectMaxInterval: 5000,
    reconnectFactor: 2
  },
  socket: {
    connectTimeoutMS: 30000,
    keepAlive: 300,
    auto_reconnect: true
  },
  mongoose: {
    server: {

    },
    replSet: {

    }
  },
  schemas: {
    users: new Schema({
      name: {
        type: String,
        unique: true
      },
      email: String,
      password: String
    })
  }
});
```
