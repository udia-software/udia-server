"use strict";

const allLinks = async (root, { filter, skip, first }, { Links }) => {
  return await Links.getLinks(filter, skip, first);
};

module.exports = {
  // allLinks
};
