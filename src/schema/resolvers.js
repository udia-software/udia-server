"use strict";

const { Kind } = require("graphql/language");
const { withFilter } = require("graphql-subscriptions");
const { authenticateUser, getIdFromJWT } = require("../modules/Auth");
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
      pubSub.publish("Node", {
        NodeSubscription: { mutation: "CREATED", node: newNode }
      });
      await Audits.createAuditRecord(
        AUDIT_ACTIVITIES.CREATE_NODE,
        originIp,
        user,
        newNode,
        { dataType, relationType, title, content, parentId }
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
        NodeSubscription: { mutation: "UPDATED", node: updatedNode }
      });
      await Audits.createAuditRecord(
        AUDIT_ACTIVITIES.UPDATE_NODE,
        originIp,
        user,
        updatedNode,
        { dataType, title, content }
      );
      return updatedNode;
    },
    deleteNode: async (_root, { id }, { Audits, Nodes, user, originIp }) => {
      const deletedNode = await Nodes.deleteNode(id, user);
      pubSub.publish("Node", {
        NodeSubscription: { mutation: "UPDATED", node: deletedNode }
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
        user,
        null,
        { email, username }
      );
      pubSub.publish("User", { UserSubscription: { user } });
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
        authPayload.user,
        null,
        { email }
      );
      pubSub.publish("User", { UserSubscription: { user: authPayload.user } });
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
        user,
        null,
        { token }
      );
      pubSub.publish("User", { UserSubscription: { user } });
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
      pubSub.publish("User", { UserSubscription: { user } });
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
      const { user, confirmedEmail } = await Users.confirmEmail(token);
      await Audits.createAuditRecord(
        AUDIT_ACTIVITIES.VERIFY_EMAIL,
        originIp,
        user,
        null,
        { token }
      );
      pubSub.publish("User", { UserSubscription: { user } });
      return confirmedEmail;
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
      pubSub.publish("User", { UserSubscription: { user } });
      return changeEmailPayload;
    }
  },
  Subscription: {
    NodeSubscription: {
      subscribe: withFilter(
        () => pubSub.asyncIterator("Node"),
        ({ NodeSubscription }, { filter }, { Nodes }) => {
          const validChild = Nodes.isNodeIdAChildOfParentId(
            NodeSubscription.node._id,
            filter.parentId
          );
          return (
            filter.mutation_in.indexOf(NodeSubscription.mutation) >= 0 &&
            validChild
          );
        }
      )
    },
    UserSubscription: {
      subscribe: withFilter(
        () => pubSub.asyncIterator("User"),
        ({ UserSubscription }, { filter }) => {
          const userId = getIdFromJWT(filter.jwt);
          return "" + userId === "" + UserSubscription.user._id;
        }
      )
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
    },
    countImmediateChildren: async ({ _id }, _data, { Nodes }) => {
      return await Nodes.countImmediateChildren(_id);
    },
    countAllChildren: async ({ _id }, _data, { Nodes }) => {
      return await Nodes.countAllChildren(_id);
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
