/* @flow */
"use strict";

const { MongoClient } = require("mongodb");
const { MONGO_URI } = require("./constants");

/**
 * Connect to the mongo daemon and return the database client instance.
 */
const connectMongo = async () => {
  const db = await MongoClient.connect(MONGO_URI);

  // Development Performance Logging
  // const { Logger } = require("mongodb");
  // const { NODE_ENV } = require("./constants");
  // if (NODE_ENV === "development") {
  //   let logCount = 0;
  //   Logger.setCurrentLogger(msg => {
  //     // eslint-disable-next-line no-console
  //     console.log(`MONGO DB REQUEST ${++logCount}: ${msg}`);
  //   });
  //   Logger.setLevel("debug");
  //   Logger.filter("class", ["Cursor"]);
  // }

  return db;
};

module.exports = connectMongo;
