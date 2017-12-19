"use strict";
const { Kind } = require("graphql/language");
const { authenticateUser } = require("../modules/Auth");
const pubSub = require("../pubsub");

module.exports = {
  Query: {
    allNodes: async (root, { filter, orderBy, skip, first }, { Nodes }) => {
      return await Nodes.allNodes(filter, orderBy, skip, first);
    },
    allLinks: async (root, { filter, skip, first }, { Links }) => {
      return await Links.allLinks(filter, skip, first);
    },
    allVotes: async (root, { filter, skip, first }, { Votes }) => {
      return await Votes.allVotes(filter, skip, first);
    },
    me: async (root, data, { user }) => {
      return user;
    }
  },
  Mutation: {
    createVote: async (root, data, { Nodes, Votes, user }) => {
      const nodeId = data.nodeId;
      const type = data.type;
      const newVote = await Votes.createVote(user, type, nodeId, Nodes);
      pubSub.publish("Vote", { Vote: { mutation: "CREATED", node: newVote } });
      return newVote;
    },
    createLink: async (root, data, { Links, user }) => {
      const url = data.url;
      const description = data.description;
      const newLink = await Links.createLink(url, description, user);
      pubSub.publish("Link", { Link: { mutation: "CREATED", node: newLink } });
      return newLink;
    },
    createUser: async (root, data, { Users }) => {
      const username = data.username;
      const email = data.email;
      const password = data.password;
      await Users.createUser(username, email, password);
      return await authenticateUser(password, email, Users);
    },
    createNode: async (root, data, { Nodes, user }) => {
      const title = data.title;
      const content = data.content;
      const type = data.type;
      const newNode = await Nodes.createNode(user, type, title, content);
      pubSub.publish("Node", { Node: { mutation: "CREATED", node: newNode } });
      return newNode;
    },
    signinUser: async (root, data, { Users }) => {
      const email = data.email.email;
      const rawPassword = data.email.password;
      return await authenticateUser(rawPassword, email, Users);
    }
  },
  Subscription: {
    Link: {
      subscribe: () => pubSub.asyncIterator("Link")
    },
    Node: {
      subscribe: () => pubSub.asyncIterator("Node")
    },
    Vote: {
      subscribe: () => pubSub.asyncIterator("Vote")
    }
  },
  Node: {
    createdBy: async ({ createdById }, data, { Users }) => {
      return await Users.getUserById(createdById);
    },
    votes: async ({ _id }, data, { Votes }) => {
      return await Votes.allVotes({ nodeId: _id });
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
      return await Nodes.allNodes({id: nodeId});
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
