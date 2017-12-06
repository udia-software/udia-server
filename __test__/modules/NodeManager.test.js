"use strict";

const { ObjectId } = require("mongodb");
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
  describe("Mutation", () => {
    it("should create a valid node", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const createdBy = await testHelper.createTestUser({});
      const title = "Test Node";
      const content = "Test Node Content";

      const node = await nodeManager.createNode(
        createdBy,
        "TEXT",
        title,
        content
      );
      expect(node).toBeDefined();
      expect(node).toHaveProperty("_id");
      expect(node.type).toBe("TEXT");
      expect(node.title).toBe(title);
      expect(node.content).toBe(content);
      const url = "http://google.com";
      const urlNode = await nodeManager.createNode(
        createdBy,
        "URL",
        title,
        url
      );
      expect(urlNode).toBeDefined();
      expect(urlNode).toHaveProperty("_id");
      expect(urlNode.type).toBe("URL");
      expect(urlNode.title).toBe(title);
      expect(urlNode.content).toBe(url);
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
      ).rejects.toEqual(
        new ValidationError([
          {
            key: "createdBy",
            message: "User must be authenticated."
          }
        ])
      );
      done();
    });

    it("should error on creating node without a type", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const createdBy = await testHelper.createTestUser({});
      const title = "Test Node";
      const content = "Test Node Content";

      await expect(
        nodeManager.createNode(createdBy, null, title, content)
      ).rejects.toEqual(
        new ValidationError([
          {
            key: "type",
            message: "Type must be TEXT or URL."
          }
        ])
      );
      done();
    });

    it("should error on creating node without a title", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const createdBy = await testHelper.createTestUser({});
      const type = "TEXT";
      const content = "Test Node Content";

      await expect(
        nodeManager.createNode(createdBy, type, null, content)
      ).rejects.toEqual(
        new ValidationError([
          {
            key: "title",
            message: "Title must not be empty."
          }
        ])
      );
      done();
    });

    it("should error on creating node without content", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const createdBy = await testHelper.createTestUser({});
      const type = "TEXT";
      const title = "Test Node";

      await expect(
        nodeManager.createNode(createdBy, type, title, null)
      ).rejects.toEqual(
        new ValidationError([
          {
            key: "content",
            message: "Content must not be empty."
          }
        ])
      );
      done();
    });

    it("should error on creating node with invalid url", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const createdBy = await testHelper.createTestUser({});
      const type = "URL";
      const title = "Test Node";
      const content = "not a url";

      await expect(
        nodeManager.createNode(createdBy, type, title, content)
      ).rejects.toEqual(
        new ValidationError([
          {
            key: "content",
            message: "Content must be a valid url."
          }
        ])
      );
      done();
    });
  });

  describe("Query", () => {
    it("should dataloader get a node by id", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const createdBy = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({
        createdBy
      });
      const getNode = await nodeManager.getNodeById(node._id);
      expect(node).toEqual(getNode);
      const noNode = await nodeManager.getNodeById(new ObjectId());
      expect(noNode).toEqual(null);
      const nullNode = await nodeManager.getNodeById(null);
      expect(nullNode).toEqual(null);
      done();
    });

    it("should filter sanely given defaults", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const nodes = await nodeManager.allNodes(null, null, null, null);
      expect(nodes).toEqual([]);
      done();
    });

    it("should filter a node by id", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const createdBy = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({
        createdBy
      });
      const nodes = await nodeManager.allNodes(
        { id: node._id },
        null,
        null,
        null
      );
      expect(nodes).toContainEqual(node);
      const noNodes = await nodeManager.allNodes(
        { id: "badid" },
        null,
        null,
        null
      );
      expect(noNodes).toHaveLength(0);
      done();
    });

    it("should filter nodes by title", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const createdBy = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({
        createdBy
      });
      const nodes = await nodeManager.allNodes(
        { title_contains: "Test" },
        null,
        null,
        null
      );
      expect(nodes).toContainEqual(node);
      const noNodes = await nodeManager.allNodes(
        { title_contains: "random" },
        null,
        null,
        null
      );
      expect(noNodes).toHaveLength(0);
      done();
    });

    it("should filter nodes by content", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const createdBy = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({
        createdBy
      });
      const nodes = await nodeManager.allNodes(
        { content_contains: "Test" },
        null,
        null,
        null
      );
      expect(nodes).toContainEqual(node);
      const noNodes = await nodeManager.allNodes(
        { content_contains: "random" },
        null,
        null,
        null
      );
      expect(noNodes).toHaveLength(0);
      done();
    });

    it("should filter nodes by createdAt", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const createdBy = await testHelper.createTestUser({});
      const beforeNodeTime = new Date(new Date().getTime() - 1000);
      const node = await testHelper.generateTestNode({
        createdBy
      });
      const afterNodeTime = new Date(new Date().getTime() + 1000);
      const ltNodes = await nodeManager.allNodes(
        { createdAt_lt: afterNodeTime },
        null,
        null,
        null
      );
      expect(ltNodes).toContainEqual(node);
      const lteNodes = await nodeManager.allNodes(
        { createdAt_lte: afterNodeTime },
        null,
        null,
        null
      );
      expect(lteNodes).toContainEqual(node);
      const gtNodes = await nodeManager.allNodes(
        { createdAt_gt: beforeNodeTime },
        null,
        null,
        null
      );
      expect(gtNodes).toContainEqual(node);
      const gteNodes = await nodeManager.allNodes(
        { createdAt_gte: beforeNodeTime },
        null,
        null,
        null
      );
      expect(gteNodes).toContainEqual(node);
      done();
    });

    it("should filter nodes by updatedAt", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const createdBy = await testHelper.createTestUser({});
      const beforeNodeTime = new Date(new Date().getTime() - 1000);
      const node = await testHelper.generateTestNode({
        createdBy
      });
      const afterNodeTime = new Date(new Date().getTime() + 1000);
      const ltNodes = await nodeManager.allNodes(
        { updatedAt_lt: afterNodeTime },
        null,
        null,
        null
      );
      expect(ltNodes).toContainEqual(node);
      const lteNodes = await nodeManager.allNodes(
        { updatedAt_lte: afterNodeTime },
        null,
        null,
        null
      );
      expect(lteNodes).toContainEqual(node);
      const gtNodes = await nodeManager.allNodes(
        { updatedAt_gt: beforeNodeTime },
        null,
        null,
        null
      );
      expect(gtNodes).toContainEqual(node);
      const gteNodes = await nodeManager.allNodes(
        { updatedAt_gte: beforeNodeTime },
        null,
        null,
        null
      );
      expect(gteNodes).toContainEqual(node);
      done();
    });

    it("should order by createdAt", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const createdBy = await testHelper.createTestUser({});
      const nodeA = await testHelper.generateTestNode({
        createdBy
      });
      await new Promise(resolve => setTimeout(resolve, 2));
      const nodeB = await testHelper.generateTestNode({
        nodeManager,
        createdBy
      });
      const ascNodes = await nodeManager.allNodes(
        null,
        "createdAt_ASC",
        null,
        null
      );
      expect(ascNodes).toHaveLength(2);
      expect(ascNodes[0]).toEqual(nodeA);
      expect(ascNodes[1]).toEqual(nodeB);
      const descNodes = await nodeManager.allNodes(
        null,
        "createdAt_DESC",
        null,
        null
      );
      expect(descNodes).toHaveLength(2);
      expect(descNodes[0]).toEqual(nodeB);
      expect(descNodes[1]).toEqual(nodeA);
      done();
    });

    it("should order by updatedAt", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const createdBy = await testHelper.createTestUser({});
      const nodeA = await testHelper.generateTestNode({
        createdBy
      });
      await new Promise(resolve => setTimeout(resolve, 2));
      const nodeB = await testHelper.generateTestNode({
        createdBy
      });
      const ascNodes = await nodeManager.allNodes(
        null,
        "updatedAt_ASC",
        null,
        null
      );
      expect(ascNodes).toHaveLength(2);
      expect(ascNodes[0]).toEqual(nodeA);
      expect(ascNodes[1]).toEqual(nodeB);
      const descNodes = await nodeManager.allNodes(
        null,
        "updatedAt_DESC",
        null,
        null
      );
      expect(descNodes).toHaveLength(2);
      expect(descNodes[0]).toEqual(nodeB);
      expect(descNodes[1]).toEqual(nodeA);
      done();
    });

    it("should filter with OR conditional", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const createdBy = await testHelper.createTestUser({});
      const nodeA = await testHelper.generateTestNode({
        createdBy,
        title: "dogs"
      });
      const nodeB = await testHelper.generateTestNode({
        createdBy,
        title: "cats"
      });
      const orNodes = await nodeManager.allNodes(
        { OR: [{ title_contains: "cats" }, { title_contains: "dogs" }] },
        null,
        null,
        null
      );
      expect(orNodes).toHaveLength(2);
      expect(orNodes).toContainEqual(nodeA);
      expect(orNodes).toContainEqual(nodeB);
      const andNodes = await nodeManager.allNodes(
        { createdAt_lt: new Date(), createdAt_gt: new Date() },
        null,
        null,
        null
      );
      expect(andNodes).toHaveLength(0);
      done();
    });

    it("should handle skip and first", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const createdBy = await testHelper.createTestUser({});
      const nodeA = await testHelper.generateTestNode({
        createdBy
      });
      const nodeB = await testHelper.generateTestNode({
        createdBy
      });
      const nodeC = await testHelper.generateTestNode({
        createdBy
      });
      const skipA = await nodeManager.allNodes(
        null,
        "createdAt_ASC",
        1, // skip 1
        2 // return 2
      );
      expect(skipA).toHaveLength(2);
      expect(skipA).not.toContainEqual(nodeA);
      const firstB = await nodeManager.allNodes(
        null,
        "createdAt_ASC",
        1, // skip 1
        1 // return 1
      );
      expect(firstB).toHaveLength(1);
      expect(firstB).toContainEqual(nodeB);
      const firstC = await nodeManager.allNodes(
        null,
        "createdAt_ASC",
        2, // skip 1
        1 // return 1
      );
      expect(firstC).toHaveLength(1);
      expect(firstC).toContainEqual(nodeC);
      done();
    });
  });
});
