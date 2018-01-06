"use strict";

const { MongoClient } = require("mongodb");
const { MONGODB_URI } = require("./constants");

// coverage don't care about db connection code
/* istanbul ignore next */
/**
 * Connect to the mongo daemon and return the database client instance.
 */
const connectMongo = async () => {
  return await MongoClient.connect(MONGODB_URI);
};

module.exports = connectMongo;
