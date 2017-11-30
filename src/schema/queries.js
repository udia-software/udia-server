"use strict";

const allLinks = async (root, { filter, skip, first }, { Links }) => {
  return await Links.getLinks(filter, skip, first);
};

const allNodes = async (root, { filter, orderBy, skip, first }, { Nodes }) => {
  return await Nodes.allNodes(filter, orderBy, skip, first);
};

module.exports = {
  allNodes
};
