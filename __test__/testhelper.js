"use strict";

const connectMongo = require("../src/connectMongo");

let _mongo = null;

/**
 * Instantiate an Mongo database connection and return the database.
 * @param {boolean} clearDatabase - Clear the db (default true)
 */
async function initializeTestState(clearDatabase = true) {
  if (!_mongo) {
    _mongo = await connectMongo("_test").catch(err => {
      // eslint-disable-next-line no-console
      console.error(err);
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

async function generateTestNode({
  createdBy,
  type = "TEXT",
  title = "Test Node",
  content = "Test Node Content"
}) {
  const NodeManager = require("../src/modules/NodeManager");
  const db = await getDatabase();
  const nodeManager = new NodeManager(db.collection("nodes"));
  return await nodeManager.createNode(createdBy, type, title, content);
}

async function generateTestVote({ user, node, type = "UP" }) {
  const NodeManager = require("../src/modules/NodeManager");
  const VoteManager = require("../src/modules/VoteManager");
  const db = await getDatabase();
  const nodeManager = new NodeManager(db.collection("nodes"));
  const voteManager = new VoteManager(db.collection("votes"));
  return await voteManager.createVote(user, type, node._id, nodeManager);
}

module.exports = {
  initializeTestState,
  tearDownTestState,
  getDatabase,
  createTestUser,
  generateTestNode,
  generateTestVote
};
