"use strict";
const { authenticateUser } = require("../modules/Auth");
const pubSub = require("../pubsub");

const createVote = async (root, data, { Nodes, Votes, user }) => {
  const nodeId = data.nodeId;
  const type = data.type;
  const newVote = await Votes.createVote(user, type, nodeId, Nodes);
  pubSub.publish("Vote", { Vote: { mutation: "CREATED", node: newVote } });
  return newVote;
};

const createLink = async (root, data, { Links, user }) => {
  const url = data.url;
  const description = data.description;
  const newLink = await Links.createLink(url, description, user);
  pubSub.publish("Link", { Link: { mutation: "CREATED", node: newLink } });
  return newLink;
};

const createUser = async (root, data, { Users }) => {
  const username = data.username;
  const email = data.email;
  const password = data.password;
  await Users.createUser(username, email, password);
  return await authenticateUser(password, email, Users);
};

const createNode = async (root, data, { Nodes, user }) => {
  const title = data.title;
  const content = data.content;
  const type = data.type;
  return await Nodes.createNode(user, type, title, content);
};

const signinUser = async (root, data, { Users }) => {
  const email = data.email.email;
  const rawPassword = data.email.password;
  return await authenticateUser(rawPassword, email, Users);
};

module.exports = {
  // createLink,
  createNode,
  createVote,
  createUser,
  signinUser
};
