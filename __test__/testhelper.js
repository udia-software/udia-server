"use strict";

const connectMongo = require("../src/connectMongo");

let _mongo = null;

async function initializeTestState(clearDatabase = true) {
  if (!_mongo) {
    _mongo = await connectMongo();
  }
  if (clearDatabase) {
    await tearDownTestState();
  }
  return _mongo;
}

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
