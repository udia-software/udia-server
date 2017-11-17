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
    _id: root => root._id || root.id,
    postedBy: async ({ postedById }, data, { Users }) => {
      return await Users.getUserById(postedById);
    },
    votes: async ({ _id }, data, { Votes }) => {
      return await Votes.getVotesByLinkId(_id);
    }
  },
  Vote: {
    _id: root => root._id || root.id,
    user: async ({ userId }, data, { Users }) => {
      return await Users.getUserById(userId);
    },
    link: async ({ linkId }, data, { Links }) => {
      return await Links.getLinkById(linkId);
    }
  },
  User: {
    _id: root => root._id || root.id,
    votes: async ({ _id }, data, { Votes }) => {
      return await Votes.getVotesByUserId(_id);
    }
  }
};
