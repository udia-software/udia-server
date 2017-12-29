"use strict";

const { MongoClient } = require("mongodb");
const { MONGODB_URI } = require("./constants");
const { NODE_ENV } = require("./constants");

/**
 * Connect to the mongo daemon and return the database client instance.
 */
const connectMongo = async suffix => {
  if (NODE_ENV === "test") {
    return await MongoClient.connect(MONGODB_URI + "_test");
  }
  // coverage don't care about db non test db.
  /* istanbul ignore next */
  return await MongoClient.connect(MONGODB_URI);
  // Development Performance Logging
  // const { Logger } = require("mongodb");
  // if (NODE_ENV === "development") {
  //   let logCount = 0;
  //   Logger.setCurrentLogger(msg => {
  //     // eslint-disable-next-line no-console
  //     console.log(`MONGO DB REQUEST ${++logCount}: ${msg}`);
  //   });
  //   Logger.setLevel("debug");
  //   Logger.filter("class", ["Cursor"]);
  // }
};

module.exports = connectMongo;
