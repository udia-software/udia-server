const { ObjectID } = require("mongodb");
const bcrypt = require("bcrypt");
const Query = require("./Query");
const Mutation = require("./Mutation")

module.exports = {
  Query: Query,
  Mutation: Mutation,
  Link: {
    id: root => root._id || root.id,
    postedBy: async ({ postedById }, data, { dataloaders: { userLoader } }) => {
      return await userLoader.load(postedById);
    },
    votes: async ({ _id }, data, { mongo: { Votes } }) => {
      return await Votes.find({ linkId: _id }).toArray();
    }
  },
  Vote: {
    id: root => root._id || root.id,
    user: async ({ userId }, data, { dataloaders: { userLoader } }) => {
      return await userLoader.load(userId);
    },
    link: async ({ linkId }, data, { mongo: { Links } }) => {
      return await Links.findOne({ _id: linkId });
    }
  },
  User: {
    id: root => root._id || root.id,
    votes: async ({ _id }, data, { mongo: { Votes } }) => {
      return await Votes.find({ userId: _id }).toArray();
    }
  },
  Subscription: {
    Link: {
      subscribe: () => pubsub.asyncIterator("Link")
    }
  }
};
