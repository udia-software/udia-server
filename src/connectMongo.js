const { Logger, MongoClient } = require("mongodb");
const { NODE_ENV, MONGO_URI } = require("./constants");

"use strict";

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

  return {
    Links: db.collection("links"),
    Users: db.collection("users"),
    Votes: db.collection("votes")
  };
};

module.exports = connectMongo;
