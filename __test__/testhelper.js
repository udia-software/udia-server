"use strict";

const connectMongo = require("../src/connectMongo");

let _mongo = null;

/**
 * Instantiate an Mongo database connection and return the database.
 * @param {boolean} clearDatabase - Clear the db (default true)
 */
async function initializeTestState(clearDatabase = true) {
  if (!_mongo) {
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

/**
 * Return the current test database instance
 */
async function getDatabase() {
  return await initializeTestState(false);
}

async function createTestUser() {
  const UserManager = require("../src/modules/UserManager");
  const db = await getDatabase();
  const userManager = new UserManager(db.collection("users"));

  const name = "Test User";
  const rawPassword = "Secret123";
  const email = "test@test.com";
  return await userManager.createUser(name, email, rawPassword);
}

async function generateTestNode(
  db,
  nodeManager,
  createdBy,
  type = "TEXT",
  title = "Test Node",
  content = "Test Node Content"
) {
  return await nodeManager.createNode(createdBy, type, title, content);
}

module.exports = {
  initializeTestState,
  tearDownTestState,
  getDatabase,
  createTestUser,
  generateTestNode
};
