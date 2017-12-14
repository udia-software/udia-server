"use strict";

const allNodes = async (root, { filter, orderBy, skip, first }, { Nodes }) => {
  return await Nodes.allNodes(filter, orderBy, skip, first);
};

const allLinks = async (root, { filter, skip, first }, { Links }) => {
  return await Links.allLinks(filter, skip, first);
};

const me = async (root, data, { user }) => {
  return user;
};

module.exports = {
  allNodes,
  allLinks,
  me
};
