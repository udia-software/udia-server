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
   * Auth Validation, check if the user is authenticated
   * @param {*} createdBy - Mongo Document containing user
   * @param {Array} errors - Array of errors
   */
  static validateAuthenticated(createdBy, errors) {
    const createdById = createdBy && createdBy._id;
    if (!createdById) {
      errors.push({
        key: "createdBy",
        message: "User must be authenticated."
      });
    }
    return createdById;
  }

  /**
   * Node DataType Validation, check if type in ENUM defs
   * @param {string} dataType - String representation of data type
   * @param {Array} errors - Array of errors
   */
  static validateDataType(dataType, errors) {
    if (["TEXT", "URL"].indexOf(dataType) < 0) {
      errors.push({
        key: "dataType",
        message: "DataType must be TEXT or URL."
      });
    }
  }

  /**
   * RelationType Validation, check if type in ENUM defs
   * @param {string} relationType - String representation of relation type
   * @param {Array} errors - Array of errors
   */
  static validateRelationType(relationType, errors) {
    if (["POST", "COMMENT"].indexOf(relationType) < 0) {
      errors.push({
        key: "relationType",
        message: "RelationType must be POST or COMMENT."
      });
    }
  }

  /**
   * Title Validation, check if title is empty
   * @param {string} title - String representation of title
   * @param {Array} errors - Array of errors
   */
  static validateTitle(title, errors) {
    if (!title || !title.trim()) {
      errors.push({
        key: "title",
        message: "Title must not be empty."
      });
    }
  }

  /**
   * Content Validation, check if content is empty
   * @param {string} content - String representation of content
   * @param {Array} errors - Array of errors
   */
  static validateContent(content, errors) {
    if (!content || !content.trim()) {
      errors.push({
        key: "content",
        message: "Content must not be empty."
      });
    }
  }

  /**
   * URL Validation, check ONLY WHEN type is URL that content is a valid URL
   * @param {string} dataType - String representation of dataType
   * @param {string} content - String representation of content
   * @param {Array} errors - Array of errors
   */
  static validateURL(dataType, content, errors) {
    if (dataType === "URL") {
      try {
        new URL(content);
      }
      catch (_) {
        errors.push({
          key: "content",
          message: "Content must be a valid url."
        });
      }
    }
  }

  /**
   * Parent Validation, check if Valid MongoID and is existing node
   * @param {string} parentId - String identifier for parent node
   * @param {Array} errors - Array of errors
   */
  async validateParent(parentId, errors) {
    let parentIdValidated = null;
    if (parentId) {
      try {
        parentIdValidated = new ObjectID(parentId);
      }
      catch (_err) {
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
    return parentIdValidated;
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
    updatedBy,
    title_contains,
    content_contains,
    createdAt_lt,
    createdAt_lte,
    createdAt_gt,
    createdAt_gte,
    updatedAt_lt,
    updatedAt_lte,
    updatedAt_gt,
    updatedAt_gte
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

    if (parent === null) {
      outputFilter.parentId = null;
    } else if (parent !== undefined) {
      try {
        outputFilter.parentId = new ObjectID(parent);
      } catch (_err) {
        outputFilter.parentId = new ObjectID();
      }
    }

    if (children_contains === null) {
      outputFilter.childrenIds = [];
    } else if (children_contains !== undefined) {
      outputFilter.childrenIds = {
        $all: children_contains.map(textId => {
          try {
            return new ObjectID(textId);
          } catch (_err) {
            return new ObjectID();
          }
        })
      };
    }

    if (createdBy !== undefined) {
      outputFilter.createdById = createdBy;
    }

    if (updatedBy !== undefined) {
      outputFilter.updatedById = updatedBy;
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
    // updatedAt Time queries
    if (updatedAt_lt) {
      outputFilter.updatedAt = {
        ...(outputFilter.updatedAt || {}),
        $lt: updatedAt_lt
      };
    }
    if (updatedAt_lte) {
      outputFilter.updatedAt = {
        ...(outputFilter.updatedAt || {}),
        $lte: updatedAt_lte
      };
    }
    if (updatedAt_gt) {
      outputFilter.updatedAt = {
        ...(outputFilter.updatedAt || {}),
        $gt: updatedAt_gt
      };
    }
    if (updatedAt_gte) {
      outputFilter.updatedAt = {
        ...(outputFilter.updatedAt || {}),
        $gte: updatedAt_gte
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
    const createdById = NodeManager.validateAuthenticated(createdBy, errors);
    NodeManager.validateDataType(dataType, errors);
    NodeManager.validateRelationType(relationType, errors);
    NodeManager.validateTitle(title, errors);
    NodeManager.validateContent(content, errors);
    NodeManager.validateURL(dataType, content, errors);
    const parentIdValidated = await this.validateParent(parentId, errors);

    if (errors.length) {
      throw new ValidationError(errors);
    }

    const now = new Date();
    const newNode = {
      dataType,
      relationType,
      title,
      content,
      createdAt: now,
      updatedAt: now,
      createdById,
      updatedById: createdById,
      parentId: parentIdValidated,
      childrenIds: []
    };
    const response = await this.collection.insert(newNode);
    const newNodeId = response.insertedIds[0];
    if (parentIdValidated) {
      // update the parent id with the child
      await this.collection.update(
        { _id: parentIdValidated },
        { $push: { childrenIds: new ObjectID(newNodeId) } }
      );
    }
    return Object.assign({ _id: newNodeId }, newNode);
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

  /**
   * Get a node from the dataloader by ID
   * @param {string} id - string representation of mongo object ID
   * @param {bool?} clearCache - whether or not to clear the dataloader cache
   */
  async _getNodeById(id, clearCache = false) {
    if (clearCache) {
      this.nodeLoader.clear(id);
    }
    return await this.nodeLoader.load(id);
  }
}

module.exports = NodeManager;
