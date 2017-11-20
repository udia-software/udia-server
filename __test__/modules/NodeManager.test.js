"use strict";

const NodeManager = require("../../src/modules/NodeManager");
const testHelper = require("../testhelper");

beforeEach(async done => {
  await testHelper.initializeTestState();
  return await done();
});

afterAll(async done => {
  await testHelper.tearDownTestState(true);
  return await done();
});

describe("NodeManager Module", () => {
  it("should create a valid node", async done => {
    const db = await testHelper.getDatabase();
    const nodeManager = new NodeManager(db.collection("nodes"));
    const createdBy = await testHelper.createTestUser();
    const type = "TEXT";
    const title = "Test Node";
    const content = "Test Node Content";

    const node = await nodeManager.createNode(createdBy, type, title, content);
    expect(node).toBeDefined();
    expect(node).toHaveProperty("_id");
    expect(node.type).toBe(type);
    expect(node.title).toBe(title);
    expect(node.content).toBe(content);
    done();
  });

  it("should error on creating node without authorization", async done => {
    const db = await testHelper.getDatabase();
    const nodeManager = new NodeManager(db.collection("nodes"));
    const type = "TEXT";
    const title = "Test Node";
    const content = "Test Node Content";

    try {
      const invalidNode = expect(
        await nodeManager.createNode(null, type, title, content)
      ).toThrow();
      expect(invalidNode).toBeUndefined();
    } catch (err) {
      expect(err).toBeDefined();
    }
    done();
  });
});
