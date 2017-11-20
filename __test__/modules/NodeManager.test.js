"use strict";

const NodeManager = require("../../src/modules/NodeManager");
const { ValidationError } = require("../../src/modules/Errors");
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

    await expect(
      nodeManager.createNode(null, type, title, content)
    ).rejects.toEqual(new ValidationError("User must be authenticated."));
    done();
  });

  it("should error on creating node without a type", async done => {
    const db = await testHelper.getDatabase();
    const nodeManager = new NodeManager(db.collection("nodes"));
    const createdBy = await testHelper.createTestUser();
    const title = "Test Node";
    const content = "Test Node Content";

    await expect(
      nodeManager.createNode(createdBy, null, title, content)
    ).rejects.toEqual(new ValidationError("Type must be TEXT or URL."));
    done();
  });

  it("should error on creating node without a title", async done => {
    const db = await testHelper.getDatabase();
    const nodeManager = new NodeManager(db.collection("nodes"));
    const createdBy = await testHelper.createTestUser();
    const type = "TEXT";
    const content = "Test Node Content";

    await expect(
      nodeManager.createNode(createdBy, type, null, content)
    ).rejects.toEqual(new ValidationError("Title must not be empty."));
    done();
  });

  it("should error on creating node without content", async done => {
    const db = await testHelper.getDatabase();
    const nodeManager = new NodeManager(db.collection("nodes"));
    const createdBy = await testHelper.createTestUser();
    const type = "TEXT";
    const title = "Test Node";
    
    await expect(
      nodeManager.createNode(createdBy, type, title, null)
    ).rejects.toEqual(new ValidationError("Content must not be empty."));
    done();
  });
});
