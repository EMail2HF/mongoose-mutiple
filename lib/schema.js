const mongoose = require('mongoose');

module.exports = (schema) => {
  const Schema = new mongoose.Schema(schema.fields, schema.options);

  // Register statics on the schema.
  Schema.statics = schema.statics;

  // Register plugins on the schema.
  if (schema.plugins) {
    schema.plugins.forEach(p => Schema.plugin(p));
  }

  // Register indexes on the schema.
  if (schema.indexes) {
    schema.indexes.forEach(i => Schema.index(i.fields || { }, i.options || { }));
  }

  return Schema;
};
