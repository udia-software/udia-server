"use strict";

const auth = require("../src/modules/Auth");
const connectMongo = require("../src/connectMongo");
const { NODE_ENV } = require("../src/constants");
const { logger } = require("../src/logger");

let _mongo = null;

/**
 * Instantiate an Mongo database connection and return the database.
 * @param {boolean} clearDatabase - Clear the db (default true)
 */
async function initializeTestState(clearDatabase = true) {
  if (!_mongo) {
    _mongo = await connectMongo().catch(err => {
      logger.error(err);
      process.exit(1);
    });
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
  const _mongo = await initializeTestState(false);
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
    await _mongo.close();
  }
}

/**
 * Return the current test database instance
 */
async function getDatabase() {
  const _mongo = await initializeTestState(false);
  if (NODE_ENV === "test") {
    return _mongo.db("udiatest");
  }
  return _mongo.db("udia");
}

async function createTestUser({
  username = "Test_User",
  rawPassword = "Secret123",
  email = "test@test.com"
}) {
  const UserManager = require("../src/modules/UserManager");
  const db = await getDatabase();
  const userManager = new UserManager(db.collection("users"));
  return await userManager.createUser(username, email, rawPassword);
}

async function getJWT({ rawPassword = "Secret123", email = "test@test.com" }) {
  const UserManager = require("../src/modules/UserManager");
  const db = await getDatabase();
  const userManager = new UserManager(db.collection("users"));
  const { token } = await auth.authenticateUser(
    rawPassword,
    email,
    userManager
  );
  return token;
}

async function generateTestNode({
  createdBy,
  dataType = "TEXT",
  relationType = "POST",
  title = "Test Node",
  content = "Test Node Content",
  parentId = null
}) {
  const NodeManager = require("../src/modules/NodeManager");
  const db = await getDatabase();
  const nodeManager = new NodeManager(db.collection("nodes"));
  return await nodeManager.createNode(
    createdBy,
    dataType,
    relationType,
    title,
    content,
    parentId
  );
}

module.exports = {
  initializeTestState,
  tearDownTestState,
  getDatabase,
  createTestUser,
  getJWT,
  generateTestNode
};
