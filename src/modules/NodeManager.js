"use strict";

const DataLoader = require("dataloader");
const { URL } = require("url");
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

  /**
   * Recursively build the filter tree. Outputs a mongodb compatible query
   * @param {NodeFilter} inputFilter - NodeFilter object (refer to schema)
   */
  static _buildFilters(inputFilter) {
    const outputFilter = {};
    if (inputFilter.id) {
      outputFilter._id = inputFilter.id;
    }
    if (inputFilter.title_contains) {
      outputFilter.title = { $regex: `.*${inputFilter.title_contains}.*` };
    }
    if (inputFilter.content_contains) {
      outputFilter.content = { $regex: `.*${inputFilter.content_contains}.*` };
    }

    // createdAt Time queries
    if (inputFilter.createdAt_lt) {
      outputFilter.createdAt = {
        ...(outputFilter.createdAt || {}),
        $lt: inputFilter.createdAt_lt
      };
    }
    if (inputFilter.createdAt_lte) {
      outputFilter.createdAt = {
        ...(outputFilter.createdAt || {}),
        $lte: inputFilter.createdAt_lte
      };
    }
    if (inputFilter.createdAt_gt) {
      outputFilter.createdAt = {
        ...(outputFilter.createdAt || {}),
        $gt: inputFilter.createdAt_gt
      };
    }
    if (inputFilter.createdAt_gte) {
      outputFilter.createdAt = {
        ...(outputFilter.createdAt || {}),
        $gte: inputFilter.createdAt_gte
      };
    }

    // updatedAt Time queries
    if (inputFilter.updatedAt_lt) {
      outputFilter.updatedAt = {
        ...(outputFilter.updatedAt || {}),
        $lt: inputFilter.updatedAt_lt
      };
    }
    if (inputFilter.updatedAt_lte) {
      outputFilter.updatedAt = {
        ...(outputFilter.updatedAt || {}),
        $lte: inputFilter.updatedAt_lte
      };
    }
    if (inputFilter.updatedAt_gt) {
      outputFilter.updatedAt = {
        ...(outputFilter.updatedAt || {}),
        $gt: inputFilter.updatedAt_gt
      };
    }
    if (inputFilter.updatedAt_gte) {
      outputFilter.updatedAt = {
        ...(outputFilter.updatedAt || {}),
        $gte: inputFilter.updatedAt_gte
      };
    }
    let filters = Object.keys(outputFilter).length ? [outputFilter] : [];
    for (let i = 0; i < (inputFilter.OR || []).length; i++) {
      filters = filters.concat(NodeManager._buildFilters(inputFilter.OR[i]));
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
    if (["TEXT", "URL"].indexOf(type) < 0) {
      errors.push({
        key: "type",
        message: "Type must be TEXT or URL."
      });
    }

    // Title Validation
    // * Check if title is empty
    if (!title || !title.trim()) {
      errors.push({
        key: "title",
        message: "Title must not be empty."
      });
    }

    // Content Validation
    // * Check if content is empty
    if (!content || !content.trim()) {
      errors.push({
        key: "content",
        message: "Content must not be empty."
      });
    }

    // URL Validation
    // * Check ONLY WHEN type is URL that content is a valid URL
    if (type === "URL") {
      try {
        new URL(content);
      } catch (_) {
        errors.push({
          key: "content",
          message: "Content must be a valid url."
        });
      }
    }

    if (errors.length) {
      throw new ValidationError(errors);
    }

    const now = new Date();
    const newNode = {
      type,
      title,
      content,
      createdAt: now,
      updatedAt: now,
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
    return await this.nodeLoader.load(id || new ObjectID());
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

    switch (orderBy) {
    case "createdAt_ASC":
      cursor.sort({ createdAt: 1 });
      break;
    case "createdAt_DESC":
      cursor.sort({ createdAt: -1 });
      break;
    case "updatedAt_ASC":
      cursor.sort({ updatedAt: 1 });
      break;
    case "updatedAt_DESC":
      cursor.sort({ updatedAt: -1 });
      break;
    default:
      break;
    }
    return await cursor.toArray();
  }
}

module.exports = NodeManager;
