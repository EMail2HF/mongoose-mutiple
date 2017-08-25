const mergeConfig = require('./mergeConfig');

describe('mergeConfig', () => {
  test('should use default settings', () => {
    const config = mergeConfig({

    });

    expect(config).toMatchObject({
      mongoose: {
        poolSize: 5,
        autoReconnect: true,
        connectTimeoutMS: 30000,
        keepAlive: 300,
        reconnectTries: 2,
        reconnectInterval: 3000,
        promiseLibrary: expect.any(Function)
      },
      reconnect: {
        reconnectTries: 2,
        reconnectFactor: 2,
        reconnectInterval: 3000,
        reconnectMaxInterval: 6000
      },
      exitOnError: false,
      exitOnTerminate: false
    });
  });

  test('should use provided settings', () => {
    const config = mergeConfig({
      Promise: 5,
      mongoose: {
        poolSize: 6,
        autoReconnect: false,
        connectTimeoutMS: 3,
        keepAlive: 4,
        foo: 'bar'
      },
      reconnect: {
        reconnectTries: 'a',
        reconnectFactor: 'b',
        reconnectInterval: 'c',
        reconnectMaxInterval: 'd'
      },
      exitOnError: true,
      exitOnTerminate: true
    });

    expect(config).toMatchObject({
      mongoose: {
        poolSize: 6,
        autoReconnect: false,
        connectTimeoutMS: 3,
        keepAlive: 4,
        reconnectTries: 'a',
        reconnectInterval: 'c',
        promiseLibrary: 5,
        foo: 'bar'
      },
      reconnect: {
        reconnectTries: 'a',
        reconnectFactor: 'b',
        reconnectInterval: 'c',
        reconnectMaxInterval: 'd'
      },
      exitOnError: true,
      exitOnTerminate: true
    });
  });
});
