"use strict";
const { ObjectID } = require("mongodb");
const { ValidationError } = require("./Errors");

class VoteManager {
  constructor(voteCollection) {
    this.collection = voteCollection;
  }

  async createVote(linkId, user) {
    const userId = user && user._id;
    if (!userId) {
      throw new ValidationError("Must be authenticated to vote.", "userId");
    }
    const newVote = {
      userId,
      linkId: new ObjectID(linkId)
    };
    const response = await this.collection.insert(newVote);
    return Object.assign({ id: response.insertedIds[0] }, newVote);
  }

  async getVotesByLinkId(linkId) {
    return await this.collection.find({ linkId }).toArray();
  }

  async getVotesByUserId(userId) {
    return await this.collection.find({ userId }).toArray();
  }
}

module.exports = VoteManager;
