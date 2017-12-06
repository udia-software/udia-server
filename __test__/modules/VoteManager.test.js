"use strict";

const NodeManager = require("../../src/modules/NodeManager");
const VoteManager = require("../../src/modules/VoteManager");
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

describe("VoteManager Module", () => {
  describe("Mutation", () => {
    it("should create a valid vote", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const voteManager = new VoteManager(db.collection("votes"));
      const user = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({ createdBy: user });
      const vote = await voteManager.createVote(
        user,
        "UP",
        node._id,
        nodeManager
      );
      expect(vote).toBeDefined();
      expect(vote).toHaveProperty("_id");
      expect(vote.type).toBe("UP");
      expect(vote.nodeId).toEqual(node._id);
      expect(vote.userId).toEqual(user._id);
      done();
    });

    it("should error on creating vote without authorization", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const voteManager = new VoteManager(db.collection("votes"));
      const user = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({ createdBy: user });
      await expect(
        voteManager.createVote(null, "UP", node._id, nodeManager)
      ).rejects.toEqual(
        new ValidationError([
          {
            key: "user",
            message: "User must be authenticated."
          }
        ])
      );
      done();
    });

    it("should error on creating vote without a type", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const voteManager = new VoteManager(db.collection("votes"));
      const user = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({ createdBy: user });
      await expect(
        voteManager.createVote(user, null, node._id, nodeManager)
      ).rejects.toEqual(
        new ValidationError([
          {
            key: "type",
            message: "Type must be UP or DOWN."
          }
        ])
      );
      done();
    });

    it("should error on creating vote without a node", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const voteManager = new VoteManager(db.collection("votes"));
      const user = await testHelper.createTestUser({});
      await expect(
        voteManager.createVote(user, "UP", null, nodeManager)
      ).rejects.toEqual(
        new ValidationError([
          {
            key: "node",
            message: "Node must exist."
          }
        ])
      );
      done();
    });

    it("should error on creating vote when voting twice", async done => {
      const db = await testHelper.getDatabase();
      const nodeManager = new NodeManager(db.collection("nodes"));
      const voteManager = new VoteManager(db.collection("votes"));
      const user = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({ createdBy: user });
      await voteManager.createVote(user, "UP", node._id, nodeManager);
      await expect(
        voteManager.createVote(user, "UP", node._id, nodeManager)
      ).rejects.toEqual(
        new ValidationError([
          {
            key: "user",
            message: "User already voted."
          }
        ])
      );
      done();
    });
  });

  describe("Query", () => {
    it("should dataloader get a vote by id", async done => {
      const db = await testHelper.getDatabase();
      const voteManager = new VoteManager(db.collection("votes"));
      const user = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({ createdBy: user });
      const vote = await testHelper.generateTestVote({ user, node });
      const getVote = await voteManager.getVoteById(vote._id);
      expect(getVote).toEqual(vote);

      const noVote = await voteManager.getVoteById();
      expect(noVote).toEqual(null);
      done();
    });
  });
});
