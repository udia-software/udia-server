"use strict";

const { Logger, MongoClient } = require("mongodb");
const { NODE_ENV, MONGO_URI } = require("./constants");

const connectMongo = async () => {
  const db = await MongoClient.connect(MONGO_URI);

  // Development Performance Logging
  if (NODE_ENV === "development") {
    let logCount = 0;
    Logger.setCurrentLogger(msg => {
      // eslint-disable-next-line no-console
      console.log(`MONGO DB REQUEST ${++logCount}: ${msg}`);
    });
    Logger.setLevel("debug");
    Logger.filter("class", ["Cursor"]);
  }


  return db;
};

module.exports = connectMongo;
