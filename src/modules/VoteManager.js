"use strict";

const DataLoader = require("dataloader");
const { ObjectID } = require("mongodb");
const { ValidationError } = require("./Errors");

class VoteManager {
  constructor(voteCollection) {
    this.collection = voteCollection;
    this.voteLoader = new DataLoader(voteIds => this._batchVotes(voteIds), {
      cacheKeyFn: key => key.toString()
    });
  }

  /**
   * Function for dataloader to batch lookup votes
   * @param {Array<string>} keys - Arrays of vote ids to batch lookup
   */
  async _batchVotes(keys = []) {
    return await this.collection
      .find({ _id: { $in: keys.map(key => new ObjectID(key)) } })
      .toArray()
      .then(votes => keys.map(id => votes.find(n => n._id.equals(id)) || null));
  }

  /**
   * Function for creating a vote
   * @param {*} user - Mongo Document, user who created the vote. Should have _id prop
   * @param {String} type - Type of vote ["UP", "DOWN"]
   * @param {String} nodeId - String, passed as arg to Mongo ObjectID()
   * @param {NodeManager} nodeManager - Used to determine if node exists
   */
  async createVote(user, type = "", nodeId = "", nodeManager) {
    const userId = user && user._id;
    if (!userId) {
      throw new ValidationError("User must be authenticated.", "user");
    }
    if (["UP", "DOWN"].indexOf(type) < 0) {
      throw new ValidationError("Type must be UP or DOWN.", "type");
    }
    const node = await nodeManager.getNodeById(nodeId);
    if (!node) {
      throw new ValidationError("Node must exist.", "nodeId");
    }
    const voted = await this._getVoteByUserIdAndNodeId(userId, node._id);
    if (voted.length > 0) {
      throw new ValidationError("User already voted.", "user");
    }
    const newVote = {
      type,
      userId,
      nodeId: node._id
    };
    const response = await this.collection.insert(newVote);
    return Object.assign({ _id: response.insertedIds[0] }, newVote);
  }

  async _getVoteByUserIdAndNodeId(userId, nodeId) {
    return await this.collection.find({ userId, nodeId }).toArray();
  }

  /**
   * Get a vote from the db by ID
   * @param {string} id - string representation of mongo object ID
   */
  async getVoteById(id = "") {
    return await this.voteLoader.load(id || new ObjectID());
  }

  async getVotesByNodeId(nodeId) {
    return await this.collection.find({ nodeId }).toArray();
  }

  async getVotesByUserId(userId) {
    return await this.collection.find({ userId }).toArray();
  }
}

module.exports = VoteManager;
