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
      .toArray();
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
      throw new ValidationError("Type must be TEXT or URL", "type");
    }
    if (!title.trim()) {
      throw new ValidationError("Title must not be empty.", "title");
    }
    if (!content.trim()) {
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
}

module.exports = NodeManager;
