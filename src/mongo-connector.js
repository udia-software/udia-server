const { Logger, MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/udia";

module.exports = async () => {
  const db = await MongoClient.connect(MONGO_URI);

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
