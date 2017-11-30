"use strict";

const DataLoader = require("dataloader");
const { ObjectID } = require("mongodb");
const { ValidationError } = require("./Errors");

class NodeManager {
  constructor(nodeCollection) {
    this.collection = nodeCollection;
    this.nodeLoader = new DataLoader(nodeIds => this._batchNodes(nodeIds), {
      cacheKeyFn: key => key.toString()
    });
  }

  /**
   * Function for dataloader to batch lookup nodes
   * @param {Array<string>} keys - Arrays of node ids to batch lookup
   */
  async _batchNodes(keys) {
    return await this.collection
      .find({ _id: { $in: keys.map(key => new ObjectID(key)) } })
      .toArray()
      .then(nodes => keys.map(id => nodes.find(n => n._id.equals(id)) || null));
  }

  static _buildFilters({ OR = [], title_contains }) {
    const filter = title_contains ? {} : null;
    if (title_contains) {
      filter.title = { $regex: `.*${title_contains}.*` };
    }
    let filters = filter ? [filter] : [];
    for (let i = 0; i < OR.length; i++) {
      filters = filters.concat(NodeManager._buildFilters(OR[i]));
    }
    return filters;
  }

  /**
   * Function for creating a single node
   * @param {*} createdBy - Mongo Document, user who created the node. Should have _id prop
   * @param {String} type - Type of node ["TEXT", "URL"]
   * @param {String} title - String, title of node
   * @param {String} content - String, content of node
   */
  async createNode(createdBy, type, title, content) {
    const createdById = createdBy && createdBy._id;
    if (!createdById) {
      throw new ValidationError("User must be authenticated.", "createdBy");
    }
    if (["TEXT", "URL"].indexOf(type) < 0) {
      throw new ValidationError("Type must be TEXT or URL.", "type");
    }
    if (!title || !title.trim()) {
      throw new ValidationError("Title must not be empty.", "title");
    }
    if (!content || !content.trim()) {
      throw new ValidationError("Content must not be empty.", "content");
    }
    const newNode = {
      type,
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById
    };
    const response = await this.collection.insert(newNode);
    return Object.assign({ _id: response.insertedIds[0] }, newNode);
  }

  /**
   * Get a node from the db by ID
   * @param {string} id - string representation of mongo object ID
   */
  async getNodeById(id) {
    return await this.nodeLoader.load(id);
  }

  /**
   * Function for getting all nodes by query parameters.
   * @param {NodeFilter|null} filter - Node Filter object tree
   * @param {NodeOrderBy|null} orderBy - Node Order By enum
   * @param {Number|null} skip - integer, number of objects to skip
   * @param {Number|null} first - integer, number of objects to return after skip
   */
  async allNodes(filter, orderBy, skip, first) {
    let query = filter ? { $or: NodeManager._buildFilters(filter) } : {};
    const cursor = this.collection.find(query);
    if (skip) {
      cursor.skip(skip);
    }
    if (first) {
      cursor.limit(first);
    }
    return await cursor.toArray();
  }
}

module.exports = NodeManager;
