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
   * Recursively build the filter tree. Outputs a mongodb compatible query
   * @param {VoteFilter} inputFilter - VoteFilter object (refer to schema)
   */
  static _buildFilters(inputFilter) {
    const outputFilter = {};
    if (inputFilter.id) {
      outputFilter._id = inputFilter.id;
    }
    if (inputFilter.nodeId) {
      outputFilter.nodeId = inputFilter.nodeId;
    }
    if (inputFilter.userId) {
      outputFilter.userId = inputFilter.userId;
    }

    let filters = Object.keys(outputFilter).length ? [outputFilter] : [];
    for (let i = 0; i < (inputFilter.OR || []).length; i++) {
      filters = filters.concat(VoteManager._buildFilters(inputFilter.OR[i]));
    }
    return filters;
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
        message: "User must be authenticated."
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
    const nodes = await nodeManager.allNodes({id: nodeId});
    if (!nodes || !nodes.length > 0) {
      errors.push({
        key: "nodeId",
        message: "Node must exist."
      });
    } else {
      // Vote Validation
      // * Check if user has already voted
      const voted = await this.allVotes({ userId, nodeId: nodes[0]._id });
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
      nodeId: nodes[0]._id
    };
    const response = await this.collection.insert(newVote);
    return Object.assign({ _id: response.insertedIds[0] }, newVote);
  }

  /**
   * Function for getting all votes by query parameters.
   * @param {VoteFilter|undefined} filter - Vote Filter object tree
   * @param {Number|undefined} skip - integer, number of objects to skip
   * @param {Number|undefined} first - integer, number of objects to return after skip
   */
  async allVotes(filter, skip, first) {
    let query = filter ? { $or: VoteManager._buildFilters(filter) } : {};
    const cursor = this.collection.find(query);
    if (skip) {
      cursor.skip(skip);
    }
    if (first) {
      cursor.limit(first);
    }
    return await cursor.toArray();
  }
}

module.exports = VoteManager;
