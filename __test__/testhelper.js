"use strict";

const connectMongo = require("../src/connectMongo");

let _mongo = null;

/**
 * Instantiate an Mongo database connection and return the database.
 * @param {boolean} clearDatabase - Clear the db (default true)
 */
async function initializeTestState(clearDatabase = true) {
  if (!_mongo) {
    console.log("connect mongo called");
    _mongo = await connectMongo();
  }
  if (clearDatabase) {
    await tearDownTestState();
  }
  return _mongo;
}

/**
 * Remove all the data in your Mongo database
 * @param {boolean} closeDatabase - Close the db connection (default false)
 */
async function tearDownTestState(closeDatabase = false) {
  const db = await getDatabase();
  const collections = await db.listCollections().toArray();
  for (let collection in collections) {
    try {
      await db.collection(collections[collection].name).remove();
    } catch (_) {
      _;
    }
  }
  if (closeDatabase) {
    await db.close();
  }
}

async function getDatabase() {
  return await initializeTestState(false);
}

module.exports = {
  initializeTestState,
  tearDownTestState,
  getDatabase
};
