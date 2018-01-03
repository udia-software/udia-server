"use strict";

const { Kind } = require("graphql/language");
const { authenticateUser } = require("../modules/Auth");
const pubSub = require("../pubsub");

module.exports = {
  Query: {
    allNodes: async (_root, { filter, orderBy, skip, first }, { Nodes }) => {
      return await Nodes.allNodes(filter, orderBy, skip, first);
    },
    me: async (_root, _data, { user }) => {
      return user;
    }
  },
  Mutation: {
    createNode: async (
      _root,
      { dataType, relationType, title, content, parentId },
      { Nodes, user }
    ) => {
      const newNode = await Nodes.createNode(
        user,
        dataType,
        relationType,
        title,
        content,
        parentId
      );
      pubSub.publish("Node", { Node: { mutation: "CREATED", node: newNode } });
      return newNode;
    },
    createUser: async (_root, { email, username, password }, { Users }) => {
      await Users.createUser(username, email, password);
      return await authenticateUser(password, email, Users);
    },
    signinUser: async (_root, { email: { email, password } }, { Users }) => {
      return await authenticateUser(password, email, Users);
    }
  },
  Subscription: {
    Node: {
      subscribe: () => pubSub.asyncIterator("Node")
    }
  },
  Node: {
    createdBy: async ({ createdById }, _data, { Users }) => {
      return await Users.getUserById(createdById);
    },
    parent: async ({ parentId }, _data, { Nodes }) => {
      const parentNodes = await Nodes.allNodes({ id: parentId });
      return (parentNodes && parentNodes.length && parentNodes[0]) || null;
    }
  },
  User: {
    nodes: async ({ _id }, { filter, orderBy, skip, first }, { Nodes }) => {
      return await Nodes.allNodes(
        { ...filter, createdBy: _id },
        orderBy,
        skip,
        first
      );
    }
  },
  FullUser: {
    nodes: async ({ _id }, { filter, orderBy, skip, first }, { Nodes }) => {
      return await Nodes.allNodes(
        { ...filter, createdBy: _id },
        orderBy,
        skip,
        first
      );
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
      switch (ast.kind) {
        case Kind.INT:
          return new Date(parseInt(ast.value, 10));
        case Kind.STRING:
          return new Date(ast.value);
        default:
          // should never get here
          return null;
      }
    }
  }
};
