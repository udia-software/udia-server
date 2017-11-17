"use strict";

const connectMongo = require("../src/connectMongo");

let collections = null;

async function initializeTestState(clearDatabase = true) {
  if (!collections) {
    collections = await connectMongo();
  }
  if (clearDatabase) {
    await tearDownTestState();
  }
  return collections;
}

async function tearDownTestState() {
  if (collections) {
    for (let key in collections) {
      if (!collections.hasOwnProperty(key)) continue;
      try {
        let collection = collections[key];
        await collection.remove();
      } catch (_) {
        _;
      }
    }
  }
}

async function getCollections() {
  return await initializeTestState(false);
}

module.exports = {
  initializeTestState,
  tearDownTestState,
  getCollections
};
