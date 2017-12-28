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
      .find({
        _id: {
          $in: keys.map(key => {
            try {
              return new ObjectID(key);
            } catch (_err) {
              return null;
            }
          })
        }
      })
      .toArray()
      .then(nodes => keys.map(id => nodes.find(n => n._id.equals(id)) || null));
  }

  /**
   * Recursively build the filter tree. Outputs a mongodb compatible query
   * @param {NodeFilter} inputFilter - NodeFilter object (refer to schema)
   */
  static _buildFilters({
    OR,
    id,
    parent,
    children_contains,
    createdBy,
    title_contains,
    content_contains,
    createdAt_lt,
    createdAt_lte,
    createdAt_gt,
    createdAt_gte
  }) {
    const outputFilter = {};

    // ID queries
    if (id !== undefined) {
      try {
        outputFilter._id = new ObjectID(id);
      } catch (_err) {
        outputFilter._id = new ObjectID();
      }
    }
    if (parent !== undefined) {
      try {
        outputFilter.parentId = new ObjectID(parent);
      } catch (_err) {
        outputFilter.parentId = new ObjectID();
      }
    }
    if (children_contains !== undefined) {
      outputFilter.childrenIds = children_contains;
    }
    if (createdBy !== undefined) {
      outputFilter.createdById = createdBy;
    }

    if (title_contains) {
      outputFilter.title = { $regex: `.*${title_contains}.*` };
    }
    if (content_contains) {
      outputFilter.content = { $regex: `.*${content_contains}.*` };
    }

    // createdAt Time queries
    if (createdAt_lt) {
      outputFilter.createdAt = {
        ...(outputFilter.createdAt || {}),
        $lt: createdAt_lt
      };
    }
    if (createdAt_lte) {
      outputFilter.createdAt = {
        ...(outputFilter.createdAt || {}),
        $lte: createdAt_lte
      };
    }
    if (createdAt_gt) {
      outputFilter.createdAt = {
        ...(outputFilter.createdAt || {}),
        $gt: createdAt_gt
      };
    }
    if (createdAt_gte) {
      outputFilter.createdAt = {
        ...(outputFilter.createdAt || {}),
        $gte: createdAt_gte
      };
    }

    // recursive structure build for OR
    let filters = Object.keys(outputFilter).length ? [outputFilter] : [];
    for (let i = 0; i < (OR || []).length; i++) {
      filters = filters.concat(NodeManager._buildFilters(OR[i]));
    }
    return filters;
  }

  /**
   * Function for creating a single node
   * @param {*} createdBy - Mongo Document, user who created the node. Should have _id prop
   * @param {String} dataType - Type of node ["TEXT", "URL"]
   * @param {String} relationType - Relation of node ["POST", "COMMENT", "UPDATE"]
   * @param {String} title - String, title of node
   * @param {String} content - String, content of node
   * @param {String?} parentId - MongoID of parent node
   */
  async createNode(
    createdBy,
    dataType,
    relationType,
    title,
    content,
    parentId
  ) {
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

    // DataType Validation
    // * Check if type in ENUM defs
    if (["TEXT", "URL"].indexOf(dataType) < 0) {
      errors.push({
        key: "dataType",
        message: "DataType must be TEXT or URL."
      });
    }

    // RelationType Validation
    // * Check if type in ENUM defs
    if (["POST", "COMMENT", "UPDATE"].indexOf(relationType) < 0) {
      errors.push({
        key: "relationType",
        message: "RelationType must be POST, COMMENT, or UPDATE."
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
    if (dataType === "URL") {
      try {
        new URL(content);
      } catch (_) {
        errors.push({
          key: "content",
          message: "Content must be a valid url."
        });
      }
    }

    // Parent Validation
    // * Check if Valid MongoID and is existing node
    let parentIdValidated = null;
    if (parentId) {
      try {
        parentIdValidated = new ObjectID(parentId);
      } catch (_err) {
        errors.push({
          key: "parentId",
          message: "ParentId must be a valid Mongo ObjectID."
        });
      }
    }
    if (parentIdValidated) {
      const parent = await this.collection.findOne({ _id: parentIdValidated });
      if (!parent) {
        errors.push({
          key: "parentId",
          message: "Parent must exist."
        });
      }
    }

    if (errors.length) {
      throw new ValidationError(errors);
    }

    const newNode = {
      dataType,
      relationType,
      title,
      content,
      createdAt: new Date(),
      createdById,
      parentId: parentIdValidated
    };
    const response = await this.collection.insert(newNode);
    return Object.assign({ _id: response.insertedIds[0] }, newNode);
  }

  /**
   * Function for getting all nodes by query parameters.
   * @param {NodeFilter|null} filter - Node Filter object tree
   * @param {NodeOrderBy|null} orderBy - Node Order By enum
   * @param {Number|null} skip - integer, number of objects to skip
   * @param {Number|null} first - integer, number of objects to return after skip
   */
  async allNodes(filter, orderBy = null, skip = null, first = null) {
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
      default:
        break;
    }
    return await cursor.toArray();
  }
}

module.exports = NodeManager;
