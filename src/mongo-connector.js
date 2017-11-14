const { Logger, MongoClient } = require("mongodb");

const MONGO_URL = "mongodb://localhost:27017/hackernews";

module.exports = async () => {
  const db = await MongoClient.connect(MONGO_URL);

  // Performance Logging
  // let logCount = 0;
  // Logger.setCurrentLogger((msg, state) => {
  //   console.log(`MONGO DB REQUEST ${++logCount}: ${msg}`);
  // });
  // Logger.setLevel('debug');
  // Logger.filter('class', ['Cursor']);

  return {
    Links: db.collection("links"),
    Users: db.collection("users"),
    Votes: db.collection("votes")
  };
};
