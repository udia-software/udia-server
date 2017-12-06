"use strict";

const { ObjectId } = require("mongodb");
const LinkManager = require("../../src/modules/LinkManager");
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

describe("LinkManager Module", () => {
  describe("Mutation", () => {
    it("should create a valid link", async done => {
      const db = await testHelper.getDatabase();
      const linkManager = new LinkManager(db.collection("links"));
      const nodeManager = new NodeManager(db.collection("nodes"));
      const user = await testHelper.createTestUser({});
      const sourceNode = await testHelper.generateTestNode({createdBy: user});
      const destNode = await testHelper.generateTestNode({createdBy: user});
      const link = await linkManager.createLink(user, "COMMENT", sourceNode._id, destNode._id, nodeManager);
      expect(link).toHaveProperty("_id");
      done();
    });

    it("should error on creating link without authorization", async done => {
      const db = await testHelper.getDatabase();
      const linkManager = new LinkManager(db.collection("links"));
      const nodeManager = new NodeManager(db.collection("nodes"));
      const user = await testHelper.createTestUser({});
      const sourceNode = await testHelper.generateTestNode({createdBy: user});
      const destNode = await testHelper.generateTestNode({createdBy: user});
      await expect(
        linkManager.createLink(null, "COMMENT", sourceNode._id, destNode._id, nodeManager)
      ).rejects.toEqual(
        new ValidationError([
          {
            key: "createdBy",
            message: "User must be authenticated."
          },
          {
            key: "destNodeId",
            message: "Destination node must belong to user."
          }
        ])
      );
      done();
    });

    it("should error on creating link with invalid type", async done => {
      const db = await testHelper.getDatabase();
      const linkManager = new LinkManager(db.collection("links"));
      const nodeManager = new NodeManager(db.collection("nodes"));
      const user = await testHelper.createTestUser({});
      const sourceNode = await testHelper.generateTestNode({createdBy: user});
      const destNode = await testHelper.generateTestNode({createdBy: user});
      await expect(
        linkManager.createLink(user, null, sourceNode._id, destNode._id, nodeManager)
      ).rejects.toEqual(
        new ValidationError([
          {
            key: "type",
            message: "Type must be COMMENT or POST."
          }
        ])
      );
      done();
    });

    it("should error on creating link with invalid source node", async done => {
      const db = await testHelper.getDatabase();
      const linkManager = new LinkManager(db.collection("links"));
      const nodeManager = new NodeManager(db.collection("nodes"));
      const user = await testHelper.createTestUser({});
      const destNode = await testHelper.generateTestNode({createdBy: user});
      await expect(
        linkManager.createLink(user, "COMMENT", null, destNode._id, nodeManager)
      ).rejects.toEqual(
        new ValidationError([
          {
            key: "sourceNodeId",
            message: "Node must exist."
          }
        ])
      );
      done();
    });

    it("should error on creating link with invalid dest node", async done => {
      const db = await testHelper.getDatabase();
      const linkManager = new LinkManager(db.collection("links"));
      const nodeManager = new NodeManager(db.collection("nodes"));
      const user = await testHelper.createTestUser({});
      const sourceNode = await testHelper.generateTestNode({createdBy: user});
      await expect(
        linkManager.createLink(user, null, sourceNode._id, null, nodeManager)
      ).rejects.toEqual(
        new ValidationError([
          {
            key: "destNodeId",
            message: "Node must exist."
          }
        ])
      );
      done();
    });
  });

  describe("Query", () => {
    it("should dataloader get a link by id", async done => {
      const db = await testHelper.getDatabase();
      const linkManager = new LinkManager(db.collection("links"));
      const nodeManager = new NodeManager(db.collection("nodes"));
      const user = await testHelper.createTestUser({});
      const sourceNode = await testHelper.generateTestNode({createdBy: user});
      const destNode = await testHelper.generateTestNode({createdBy: user});
      const link = await linkManager.createLink(user, "COMMENT", sourceNode._id, destNode._id, nodeManager);

      const getLink = await linkManager.getLinkById(link._id);
      expect(link).toEqual(getLink);
      const noLink = await linkManager.getLinkById(new ObjectId());
      expect(noLink).toEqual(null);
      const nullLink = await linkManager.getLinkById(null);
      expect(nullLink).toEqual(null);
      done();
    });

    it("should filter sanely given defaults", async done => {
      const db = await testHelper.getDatabase();
      const linkManager = new LinkManager(db.collection("links"));
      const links = await linkManager.allLinks(null, null, null);
      expect(links).toEqual([]);
      done();
    });

    it("should filter a link by id", async done => {
      const db = await testHelper.getDatabase();
      const linkManager = new LinkManager(db.collection("links"));
      const nodeManager = new NodeManager(db.collection("nodes"));
      const user = await testHelper.createTestUser({});
      const sourceNode = await testHelper.generateTestNode({createdBy: user});
      const destNode = await testHelper.generateTestNode({createdBy: user});
      const link = await linkManager.createLink(user, "COMMENT", sourceNode._id, destNode._id, nodeManager);

      const links = await linkManager.allLinks({id: link._id }, null, null);
      expect(links).toContainEqual(link);
      const noLinks = await linkManager.allLinks({id: "badid"}, null, null);
      expect(noLinks).toHaveLength(0);
      done();
    });

    it("should filter a link by source node", async done => {
      const db = await testHelper.getDatabase();
      const linkManager = new LinkManager(db.collection("links"));
      const nodeManager = new NodeManager(db.collection("nodes"));
      const user = await testHelper.createTestUser({});
      const sourceNode = await testHelper.generateTestNode({createdBy: user});
      const destNode = await testHelper.generateTestNode({createdBy: user});
      const link = await linkManager.createLink(user, "COMMENT", sourceNode._id, destNode._id, nodeManager);

      const links = await linkManager.allLinks({sourceNodeId: sourceNode._id }, null, null);
      expect(links).toContainEqual(link);
      const noLinks = await linkManager.allLinks({sourceNodeId: "badid"}, null, null);
      expect(noLinks).toHaveLength(0);
      done();
    });

    it("should filter with OR conditional", async done => {
      const db = await testHelper.getDatabase();
      const linkManager = new LinkManager(db.collection("links"));
      const nodeManager = new NodeManager(db.collection("nodes"));
      const user = await testHelper.createTestUser({});
      const sourceNode = await testHelper.generateTestNode({createdBy: user});
      const destNode = await testHelper.generateTestNode({createdBy: user});
      const commentLink = await linkManager.createLink(user, "COMMENT", sourceNode._id, destNode._id, nodeManager);
      const postLink = await linkManager.createLink(user, "POST", sourceNode._id, destNode._id, nodeManager);
      const orLinks = await linkManager.allLinks({ OR: [{id: commentLink._id}, {id: postLink._id}] }, null, null);
      expect(orLinks).toHaveLength(2);
      expect(orLinks).toContainEqual(commentLink);
      expect(orLinks).toContainEqual(postLink);
      done();
    });

    it("should handle skip and first", async done => {
      const db = await testHelper.getDatabase();
      const linkManager = new LinkManager(db.collection("links"));
      const nodeManager = new NodeManager(db.collection("nodes"));
      const user = await testHelper.createTestUser({});
      const sourceNode = await testHelper.generateTestNode({createdBy: user});
      const destNode = await testHelper.generateTestNode({createdBy: user});
      const link = await linkManager.createLink(user, "COMMENT", sourceNode._id, destNode._id, nodeManager);
      const skipLinks = await linkManager.allLinks(null, 1, null);
      expect(skipLinks).toHaveLength(0);
      const firstLinks = await linkManager.allLinks(null, 0, 1);
      expect(firstLinks).toHaveLength(1);
      expect(firstLinks).toContainEqual(link);
      done();
    });
  });
});
