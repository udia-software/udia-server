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
  async _batchVotes(keys) {
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
  async createVote(user, type, nodeId, nodeManager) {
    const errors = [];

    const userId = user && user._id;

    // Auth Validation
    // * Check if the user is authenticated
    if (!userId) {
      errors.push({
        key: "user",
        message: "User must be authenticated.",
      });
    }

    // Type Validation
    // * Check if type in ENUM defs
    if (["UP", "DOWN"].indexOf(type) < 0) {
      errors.push({
        key: "type",
        message: "Type must be UP or DOWN."
      });
    }

    // Node Validation
    // * Check if node to vote on exists
    const node = await nodeManager.getNodeById(nodeId);
    if (!node) {
      errors.push({
        key: "nodeId",
        message: "Node must exist."
      });
    } else {
      // Vote Validation
      // * Check if user has already voted
      const voted = await this._getVoteByUserIdAndNodeId(userId, node._id);
      if (voted.length > 0) {
        errors.push({
          message: "User already voted.",
          key: "user"
        });
      }
    }
    

    if (errors.length) {
      throw new ValidationError(errors);
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

  // async getVotesByNodeId(nodeId) {
  //   return await this.collection.find({ nodeId }).toArray();
  // }

  // async getVotesByUserId(userId) {
  //   return await this.collection.find({ userId }).toArray();
  // }
}

module.exports = VoteManager;
