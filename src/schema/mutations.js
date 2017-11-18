"use strict";
const { authenticateUser } = require("../modules/Auth");
const pubSub = require("../pubSub");

const createVote = async (root, data, { Votes, user }) => {
  const linkId = data.linkId;
  const newVote = await Votes.createVote(linkId, user);
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
  const name = data.name;
  const email = data.authProvider.email.email;
  const rawPassword = data.authProvider.email.password;
  return await Users.createUser(name, email, rawPassword);
};

const signinUser = async (root, data, { Users }) => {
  const email = data.email.email;
  const rawPassword = data.email.password;
  return await authenticateUser(rawPassword, email, Users);
};

module.exports = {
  // createLink,
  createVote,
  createUser,
  signinUser
};
