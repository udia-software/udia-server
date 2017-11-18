const Query = require("./queries");
const Mutation = require("./mutations");
const pubSub = require("../pubSub");

module.exports = {
  Query: Query,
  Mutation: Mutation,
  Subscription: {
    Link: {
      subscribe: () => pubSub.asyncIterator("Link")
    }
  },
  Link: {
    id: root => root._id || root.id,
    createdBy: async ({ postedById }, data, { Users }) => {
      return await Users.getUserById(postedById);
    }
  },
  Vote: {
    id: root => root._id || root.id,
    user: async ({ userId }, data, { Users }) => {
      return await Users.getUserById(userId);
    },
    node: async ({ linkId }, data, { Links }) => {
      return await Links.getLinkById(linkId);
    }
  },
  User: {
    id: root => root._id || root.id,
    votes: async ({ _id }, data, { Votes }) => {
      return await Votes.getVotesByUserId(_id);
    }
  }
};
