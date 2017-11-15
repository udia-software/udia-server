"use strict";
const { ObjectID } = require("mongodb");

class VoteManager {
  constructor(voteCollection) {
    this.collection = voteCollection;
  }

  async createVote(linkId, user) {
    const newVote = {
      userId: user && user._id,
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
