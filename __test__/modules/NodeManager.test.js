"use strict";

const { ObjectId } = require("mongodb");
const NodeManager = require("../../src/modules/NodeManager");
const { ValidationError } = require("../../src/modules/Errors");
const testHelper = require("../testhelper");

let db = null;
let nodeManager = null;

beforeAll(async done => {
  await testHelper.initializeTestState(true);
  db = await testHelper.getDatabase();
  nodeManager = new NodeManager(db.collection("nodes"));
  done();
});

afterEach(async done => {
  await testHelper.tearDownTestState();
  done();
});

afterAll(async done => {
  await testHelper.tearDownTestState(true);
  done();
});

describe("NodeManager Module", () => {
  describe("Mutation", () => {
    it("should create a valid node", async done => {
      const createdBy = await testHelper.createTestUser({});
      const title = "Test Node";
      const content = "Test Node Content";

      const node = await nodeManager.createNode(
        createdBy,
        "TEXT",
        "POST",
        title,
        content
      );
      expect(node).toBeDefined();
      expect(node).toHaveProperty("_id");
      expect(node.dataType).toBe("TEXT");
      expect(node.relationType).toBe("POST");
      expect(node.title).toBe(title);
      expect(node.content).toBe(content);
      expect(node.parentId).toBeNull();
      expect(node.createdById).toBe(createdBy._id);
      const url = "http://google.com";
      const urlNode = await nodeManager.createNode(
        createdBy,
        "URL",
        "POST",
        title,
        url
      );
      expect(urlNode).toBeDefined();
      expect(urlNode).toHaveProperty("_id");
      expect(urlNode.dataType).toBe("URL");
      expect(urlNode.relationType).toBe("POST");
      expect(urlNode.title).toBe(title);
      expect(urlNode.content).toBe(url);
      expect(urlNode.parentId).toBeNull();
      expect(urlNode.createdById).toBe(createdBy._id);
      done();
    });

    it("should create a valid child node", async done => {
      const createdBy = await testHelper.createTestUser({});
      const title = "Test Node";
      const content = "Test Node Content";

      const node = await nodeManager.createNode(
        createdBy,
        "TEXT",
        "POST",
        title,
        content
      );
      expect(node).toBeDefined();
      expect(node).toHaveProperty("_id");
      expect(node.dataType).toBe("TEXT");
      expect(node.relationType).toBe("POST");
      expect(node.title).toBe(title);
      expect(node.content).toBe(content);
      expect(node.parentId).toBeNull();
      expect(node.createdById).toBe(createdBy._id);

      const commentTitle = "tldr; nice post.";
      const commentContent = "I dig the test node content";
      const commentNode = await nodeManager.createNode(
        createdBy,
        "TEXT",
        "COMMENT",
        commentTitle,
        commentContent,
        "" + node._id
      );
      expect(commentNode).toBeDefined();
      expect(commentNode).toHaveProperty("_id");
      expect(commentNode.dataType).toBe("TEXT");
      expect(commentNode.relationType).toBe("COMMENT");
      expect(commentNode.title).toBe(commentTitle);
      expect(commentNode.content).toBe(commentContent);
      expect(commentNode.parentId).toEqual(node._id);
      expect(commentNode.createdById).toBe(createdBy._id);

      done();
    });

    it("should update a valid node", async done => {
      const createdBy = await testHelper.createTestUser({});
      let node = await testHelper.generateTestNode({ createdBy, title: "A" });
      expect(node.title).toEqual("A");
      expect(node.updatedAt).toEqual(node.createdAt);
      node = await nodeManager.updateNode(node._id, createdBy, null, "B", null);
      expect(node.title).toEqual("B");
      expect(node.updatedAt.getTime()).toBeGreaterThan(
        node.createdAt.getTime()
      );
      done();
    });

    it("should delete a valid node", async done => {
      const createdBy = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({ createdBy });
      let deletedNode = await nodeManager.deleteNode(node._id, createdBy);
      expect(deletedNode._id).toEqual(node._id);
      expect(deletedNode).toEqual({
        _id: node._id,
        childrenIds: [],
        content: null,
        createdAt: null,
        createdById: null,
        dataType: "TEXT",
        parentId: null,
        relationType: "POST",
        title: null,
        updatedAt: null,
        updatedById: null
      });
      done();
    });

    it("should error on creating node without authorization", async done => {
      const type = "TEXT";
      const title = "Test Node";
      const content = "Test Node Content";

      await expect(
        nodeManager.createNode(null, type, title, content)
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on creating node without a type", async done => {
      const createdBy = await testHelper.createTestUser({});
      const title = "Test Node";
      const content = "Test Node Content";

      await expect(
        nodeManager.createNode(createdBy, null, title, content)
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on creating node without a title", async done => {
      const createdBy = await testHelper.createTestUser({});
      const type = "TEXT";
      const content = "Test Node Content";

      await expect(
        nodeManager.createNode(createdBy, type, null, content)
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on creating node without content", async done => {
      const createdBy = await testHelper.createTestUser({});
      const type = "TEXT";
      const title = "Test Node";

      await expect(
        nodeManager.createNode(createdBy, type, title, null)
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on creating node with invalid url", async done => {
      const createdBy = await testHelper.createTestUser({});
      const type = "URL";
      const title = "Test Node";
      const content = "not a url";

      await expect(
        nodeManager.createNode(createdBy, type, title, content)
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on creating node with invalid parent", async done => {
      const createdBy = await testHelper.createTestUser({});
      const fakeId = new ObjectId();
      await expect(
        nodeManager.createNode(
          createdBy,
          "TEXT",
          "COMMENT",
          "Title",
          "Content",
          fakeId + ""
        )
      ).rejects.toEqual(new ValidationError());
      await expect(
        nodeManager.createNode(
          createdBy,
          "TEXT",
          "COMMENT",
          "Title",
          "Content",
          "badid"
        )
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on updating node with no changes", async done => {
      const createdBy = await testHelper.createTestUser({});
      let node = await testHelper.generateTestNode({ createdBy });
      await expect(
        nodeManager.updateNode(
          node._id,
          createdBy,
          node.dataType,
          node.title,
          node.content
        )
      ).rejects.toEqual(new ValidationError());

      await expect(
        nodeManager.updateNode(node._id, createdBy, null, null, null)
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on updating node with invalid user", async done => {
      const createdBy = await testHelper.createTestUser({
        username: "og",
        email: "og@test.com"
      });
      const invalidUpdater = await testHelper.createTestUser({
        username: "invalid",
        email: "invalid@test.com"
      });
      const node = await testHelper.generateTestNode({ createdBy });
      await expect(
        nodeManager.updateNode(node._id, invalidUpdater, null, "bad", "update")
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on updating node that doesn't exist", async done => {
      const updateUser = await testHelper.createTestUser({});
      await expect(
        nodeManager.updateNode(new ObjectId(), updateUser, null, null, null)
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on deleting a node with invalid user", async done => {
      const createdBy = await testHelper.createTestUser({
        username: "og",
        email: "og@test.com"
      });
      const invalidDeleter = await testHelper.createTestUser({
        username: "invalid",
        email: "invalid@test.com"
      });
      const node = await testHelper.generateTestNode({ createdBy });
      await expect(
        nodeManager.deleteNode(node._id, invalidDeleter)
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on deleting node that doesn't exist", async done => {
      const deleteUser = await testHelper.createTestUser({});
      await expect(
        nodeManager.deleteNode(new ObjectId(), deleteUser)
      ).rejects.toEqual(new ValidationError());
      done();
    });
  });

  describe("Query", () => {
    it("should filter sanely given defaults", async done => {
      const nodes = await nodeManager.allNodes(null, null, null, null);
      expect(nodes).toEqual([]);
      done();
    });

    it("should filter a node by id", async done => {
      const createdBy = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({ createdBy });
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

    it("should filter a node by id_in", async done => {
      const createdBy = await testHelper.createTestUser({});
      const nodeA = await testHelper.generateTestNode({ createdBy });
      const nodeB = await testHelper.generateTestNode({ createdBy });
      const nodes = await nodeManager.allNodes(
        { id_in: [nodeA._id, nodeB._id, "badid"] },
        null,
        null,
        null
      );
      expect(nodes).toContainEqual(nodeA);
      expect(nodes).toContainEqual(nodeB);
      expect(nodes).toHaveLength(2);
      done();
    });

    it("should filter nodes by title", async done => {
      const createdBy = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({ createdBy });
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
      const createdBy = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({ createdBy });
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
      const createdBy = await testHelper.createTestUser({});
      const beforeNodeTime = new Date(new Date().getTime() - 1000);
      const node = await testHelper.generateTestNode({ createdBy });
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
      const createdBy = await testHelper.createTestUser({});
      const beforeNodeTime = new Date(new Date().getTime() - 1000);
      const node = await testHelper.generateTestNode({ createdBy });
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

    it("should filter nodes by parent", async done => {
      const createdBy = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({ createdBy });
      const commentNode = await testHelper.generateTestNode({
        createdBy,
        relationType: "COMMENT",
        parentId: node._id + ""
      });
      const hasParentNodes = await nodeManager.allNodes({
        parent: node._id + ""
      });
      expect(hasParentNodes).toContainEqual(commentNode);
      const noParentNodes = await nodeManager.allNodes({
        parent: commentNode._id + ""
      });
      expect(noParentNodes).toHaveLength(0);
      const nullParentNodes = await nodeManager.allNodes({
        parent: null
      });
      expect(nullParentNodes).toContainEqual(
        await nodeManager.getNodeById(node._id)
      );
      const badIdNodes = await nodeManager.allNodes({
        parent: "foobar"
      });
      expect(badIdNodes).toHaveLength(0);
      done();
    });

    it("should filter nodes by children", async done => {
      const createdBy = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({ createdBy });
      const commentNode = await testHelper.generateTestNode({
        createdBy,
        relationType: "COMMENT",
        parentId: node._id + ""
      });
      const hasChildrenNodes = await nodeManager.allNodes({
        children_contains: [commentNode._id + ""]
      });
      expect(hasChildrenNodes).toContainEqual(
        await nodeManager.getNodeById(node._id)
      );
      const newCommentNode = await testHelper.generateTestNode({
        createdBy,
        relationType: "COMMENT",
        parentId: node._id + ""
      });
      const hasMultipleChildrenNodes = await nodeManager.allNodes({
        children_contains: [commentNode._id, newCommentNode._id]
      });
      expect(hasMultipleChildrenNodes).toContainEqual(
        await nodeManager.getNodeById(node._id, true)
      );
      const noChildrenNodes = await nodeManager.allNodes({
        children_contains: [node._id + ""]
      });
      expect(noChildrenNodes).toHaveLength(0);
      const nullChildrenNodes = await nodeManager.allNodes({
        children_contains: null
      });
      expect(nullChildrenNodes).toContainEqual(commentNode);
      const badIdNodes = await nodeManager.allNodes({
        children_contains: ["foobar"]
      });
      expect(badIdNodes).toHaveLength(0);
      done();
    });

    it("should filter nodes by createdBy", async done => {
      const createdBy = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({ createdBy });
      const createdByNodes = await nodeManager.allNodes({
        createdBy: createdBy._id
      });
      expect(createdByNodes).toContainEqual(node);
      done();
    });

    it("should order by createdAt", async done => {
      const createdBy = await testHelper.createTestUser({});
      const nodeA = await testHelper.generateTestNode({ createdBy });
      await new Promise(resolve => setTimeout(resolve, 2));
      const nodeB = await testHelper.generateTestNode({ createdBy });
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
      const createdBy = await testHelper.createTestUser({});
      const nodeA = await testHelper.generateTestNode({ createdBy });
      await new Promise(resolve => setTimeout(resolve, 2));
      const nodeB = await testHelper.generateTestNode({ createdBy });
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
      const createdBy = await testHelper.createTestUser({});
      const nodeA = await testHelper.generateTestNode({ createdBy });
      const nodeB = await testHelper.generateTestNode({ createdBy });
      const nodeC = await testHelper.generateTestNode({ createdBy });
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

  describe("Meta", () => {
    it("should use dataloader to get a node by ID", async done => {
      const createdBy = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({ createdBy });
      expect(await nodeManager.getNodeById(node._id)).toBeDefined();
      done();
    });

    it("should gracefully handle bad keys", async done => {
      expect(await nodeManager.getNodeById(new ObjectId())).toBeNull();
      expect(await nodeManager.getNodeById("")).toBeNull();
      expect(await nodeManager.getNodeById("bloop")).toBeNull();
      done();
    });
  });
});
