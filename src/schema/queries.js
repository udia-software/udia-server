"use strict";

const allNodes = async (root, { filter, orderBy, skip, first }, { Nodes }) => {
  return await Nodes.allNodes(filter, orderBy, skip, first);
};

module.exports = {
  allNodes
};
