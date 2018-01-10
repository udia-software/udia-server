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
    updateNode: async (
      _root,
      { id, dataType, title, content },
      { Nodes, user }
    ) => {
      const updatedNode = await Nodes.updateNode(
        id,
        user,
        dataType,
        title,
        content
      );
      pubSub.publish("Node", {
        Node: { mutation: "UPDATED", node: updatedNode }
      });
      return updatedNode;
    },
    deleteNode: async (_root, { id }, { Nodes, user }) => {
      const deletedNode = await Nodes.deleteNode(id, user);
      pubSub.publish("Node", {
        Node: { mutation: "UPDATED", node: deletedNode }
      });
      return deletedNode;
    },
    createUser: async (_root, { email, username, password }, { Users }) => {
      await Users.createUser(username, email, password);
      return await authenticateUser(password, email, Users);
    },
    signinUser: async (_root, { email: { email, password } }, { Users }) => {
      return await authenticateUser(password, email, Users);
    },
    confirmEmail: async(_root, { token }, { Users, user }) => {
      
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
    updatedBy: async ({ updatedById }, _data, { Users }) => {
      return await Users.getUserById(updatedById);
    },
    parent: async ({ parentId }, _data, { Nodes }) => {
      const parentNodes = await Nodes.allNodes({ id: parentId });
      return (parentNodes && parentNodes.length && parentNodes[0]) || null;
    },
    children: async ({ _id }, { filter, orderBy, skip, first }, { Nodes }) => {
      return await Nodes.allNodes(
        { ...filter, parent: _id },
        orderBy,
        skip,
        first
      );
    }
  },
  User: {
    createdNodes: async (
      { _id },
      { filter, orderBy, skip, first },
      { Nodes }
    ) => {
      return await Nodes.allNodes(
        { ...filter, createdBy: _id },
        orderBy,
        skip,
        first
      );
    },
    updatedNodes: async (
      { _id },
      { filter, orderBy, skip, first },
      { Nodes }
    ) => {
      return await Nodes.allNodes(
        { ...filter, updatedBy: _id },
        orderBy,
        skip,
        first
      );
    }
  },
  FullUser: {
    createdNodes: async (
      { _id },
      { filter, orderBy, skip, first },
      { Nodes }
    ) => {
      return await Nodes.allNodes(
        { ...filter, createdBy: _id },
        orderBy,
        skip,
        first
      );
    },
    updatedNodes: async (
      { _id },
      { filter, orderBy, skip, first },
      { Nodes }
    ) => {
      return await Nodes.allNodes(
        { ...filter, updatedBy: _id },
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
      if (ast.kind === Kind.INT) {
        return new Date(parseInt(ast.value, 10));
      } else {
        // default just try to do naive cast
        return new Date(ast.value);
      }
    }
  }
};
