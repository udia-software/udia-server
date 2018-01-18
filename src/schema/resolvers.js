"use strict";

const { Kind } = require("graphql/language");
const { authenticateUser } = require("../modules/Auth");
const { AUDIT_ACTIVITIES } = require("../constants");
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
      { Audits, Nodes, user, originIp }
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
      await Audits.createAuditRecord(
        AUDIT_ACTIVITIES.CREATE_NODE,
        originIp,
        user,
        newNode
      );
      return newNode;
    },
    updateNode: async (
      _root,
      { id, dataType, title, content },
      { Audits, Nodes, user, originIp }
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
      await Audits.createAuditRecord(
        AUDIT_ACTIVITIES.UPDATE_NODE,
        originIp,
        user,
        updatedNode
      );
      return updatedNode;
    },
    deleteNode: async (_root, { id }, { Audits, Nodes, user, originIp }) => {
      const deletedNode = await Nodes.deleteNode(id, user);
      pubSub.publish("Node", {
        Node: { mutation: "UPDATED", node: deletedNode }
      });
      await Audits.createAuditRecord(
        AUDIT_ACTIVITIES.DELETE_NODE,
        originIp,
        user,
        deletedNode
      );
      return deletedNode;
    },
    createUser: async (
      _root,
      { email, username, password },
      { Audits, Users, originIp }
    ) => {
      const user = await Users.createUser(username, email, password);
      await Audits.createAuditRecord(
        AUDIT_ACTIVITIES.CREATE_USER,
        originIp,
        user
      );
      return await authenticateUser(password, email, Users);
    },
    signinUser: async (
      _root,
      { email: { email, password } },
      { Audits, Users, originIp }
    ) => {
      await Audits.createAuditRecord(
        AUDIT_ACTIVITIES.LOGIN_ATTEMPT,
        originIp,
        null,
        null,
        { email }
      );
      const authPayload = await authenticateUser(password, email, Users);
      await Audits.createAuditRecord(
        AUDIT_ACTIVITIES.LOGIN_SUCCESS,
        originIp,
        authPayload.user
      );
      return authPayload;
    },
    forgotPassword: async (_root, { email }, { Audits, Users, originIp }) => {
      await Audits.createAuditRecord(
        AUDIT_ACTIVITIES.RESET_PASSWORD_REQUEST,
        originIp,
        null,
        null,
        { email }
      );
      return await Users.forgotPasswordRequest(email);
    },
    generateNewPassword: async (
      _root,
      { token, password },
      { Audits, Users, originIp }
    ) => {
      const user = await Users.updatePasswordWithToken(token, password);
      await Audits.createAuditRecord(
        AUDIT_ACTIVITIES.TOKEN_CHANGE_PASSWORD,
        originIp,
        user
      );
      return await authenticateUser(password, user.email, Users);
    },
    updatePassword: async (
      _root,
      { password },
      { Audits, Users, user, originIp }
    ) => {
      await Audits.createAuditRecord(
        AUDIT_ACTIVITIES.CHANGE_PASSWORD,
        originIp,
        user
      );
      return await Users.updatePassword(user, password);
    },
    resendConfirmationEmail: async (
      _root,
      _params,
      { Audits, Users, user, originIp }
    ) => {
      await Audits.createAuditRecord(
        AUDIT_ACTIVITIES.RESEND_CONFIRMATION_EMAIL,
        originIp,
        user
      );
      return await Users.resendConfirmationEmail(user);
    },
    confirmEmail: async (_root, { token }, { Audits, Users, originIp }) => {
      const confirmEmailPayload = await Users.confirmEmail(token);
      await Audits.createAuditRecord(
        AUDIT_ACTIVITIES.VERIFY_EMAIL,
        originIp,
        null,
        null,
        { token }
      );
      return confirmEmailPayload;
    },
    changeEmail: async (
      _root,
      { email },
      { Audits, Users, user, originIp }
    ) => {
      const changeEmailPayload = await Users.changeEmail(user, email);
      await Audits.createAuditRecord(
        AUDIT_ACTIVITIES.CHANGE_EMAIL,
        originIp,
        user,
        null,
        { email }
      );
      return changeEmailPayload;
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
