"use strict";

const DataLoader = require("dataloader");
const { ObjectID } = require("mongodb");
const { URL } = require("url");
const { ValidationError } = require("./Errors");

class LinkManager {
  constructor(linkCollection) {
    this.collection = linkCollection;
    this.linkLoader = new DataLoader(linkIds => this._batchLinks(linkIds), {
      cacheKeyFn: key => key.toString()
    });
  }

  async _batchLinks(keys) {
    return await this.collection
      .find({_id: {$in: keys.map(key => new ObjectID(key)) } })
      .toArray()
      .then(links => keys.map(id => links.find(l => l._id.equals(id)) || null ));
  }

  /**
   * Recursively build the filter tree. Outputs a mongodb compatible query
   * @param {LinkFilter} inputFilter - LinkFilter object (refer to schema)
   */
  static _buildFilters(inputFilter) {
    const outputFilter = {};
    if (inputFilter.id) {
      outputFilter._id = inputFilter.id;
    }
    if (inputFilter.sourceNodeId) {
      outputFilter.sourceNodeId = inputFilter.sourceNodeId;
    }
    let filters = Object.keys(outputFilter).length ? [outputFilter] : [];
    for (let i = 0; i < (inputFilter.OR || []).length; i++) {
      filters = filters.concat(LinkManager._buildFilters(inputFilter.OR[i]));
    }
    return filters;
  }

  /**
   * Function for creating a link to a new node.
   * @param {*} createdBy - Mongo Document, user who created the link. Should have _id prop
   * @param {String} type - Type of link ["COMMENT", "POST"]
   * @param {String} sourceNodeId - String, MongoID of node to originate from
   * @param {String} destNodeId - String, MongoID of Node destination
   * @param {NodeManager} Nodes - Node Manager for validating existence of nodes
   */
  async createLink(createdBy, type, sourceNodeId, destNodeId, Nodes) {
    const errors = [];

    // Auth Validation
    // * Check if the user is authenticated
    const createdById = createdBy && createdBy._id;
    if (!createdById) {
      errors.push({
        key: "createdBy",
        message: "User must be authenticated."
      });
    }

    // Type Validation
    // * Check if type in ENUM defs
    if (["COMMENT", "POST"].indexOf(type) < 0) {
      errors.push({
        key: "type",
        message: "Type must be COMMENT or POST."
      });
    }

    // Node Validation
    // * Check if source and dest nodes exist
    // * Check that dest node user matches link user
    const sourceNode = await Nodes.getNodeById(sourceNodeId);
    if (!sourceNode) {
      errors.push({
        key: "sourceNodeId",
        message: "Node must exist."
      });
    }
    const destNode = await Nodes.getNodeById(destNodeId);
    if (!destNode) {
      errors.push({
        key: "destNodeId",
        message: "Node must exist."
      });
    } else if (!destNode.createdById.equals(createdById)) {
      errors.push({
        key: "destNodeId",
        message: "Destination node must belong to user."
      });
    }

    if (errors.length) {
      throw new ValidationError(errors);
    }

    const newLink = { type, sourceNodeId, destNodeId, createdById };
    const response = await this.collection.insert(newLink);
    return Object.assign({ _id: response.insertedIds[0] }, newLink);
  }

  async allLinks(filter, skip, first) {
    let query = filter ? { $or: LinkManager._buildFilters(filter) } : {};
    const cursor = this.collection.find(query);
    if (first) {
      cursor.limit(first);
    }
    if (skip) {
      cursor.skip(skip);
    }
    return await cursor.toArray();
  }

  async getLinkById(id) {
    return await this.linkLoader.load(id || new ObjectID());
  }
}

module.exports = LinkManager;
