const { Kind } = require("graphql/language");
const Query = require("./queries");
const Mutation = require("./mutations");
const pubSub = require("../pubsub");

module.exports = {
  Query: Query,
  Mutation: Mutation,
  Subscription: {
    Link: {
      subscribe: () => pubSub.asyncIterator("Link")
    }
  },
  Node: {
    createdBy: async ({ createdById }, data, { Users }) => {
      return await Users.getUserById(createdById);
    }
  },
  Link: {
    createdBy: async ({ postedById }, data, { Users }) => {
      return await Users.getUserById(postedById);
    }
  },
  Vote: {
    user: async ({ userId }, data, { Users }) => {
      return await Users.getUserById(userId);
    },
    node: async ({ nodeId }, data, { Nodes }) => {
      return await Nodes.getNodeById(nodeId);
    }
  },
  User: {
    votes: async ({ _id }, data, { Votes }) => {
      return await Votes.getVotesByUserId(_id);
    }
  },
  DateTime: {
    __parseValue(value) {
      return new Date(value); // value from the client
    },
    __serialize(value) {
      return value.getTime(); // value sent to the client
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return parseInt(ast.value, 10); // ast value is always in string format
      }
      return null;
    }
  }
};
