"use strict";

const DataLoader = require("dataloader");
const { URL } = require("url");
const { ObjectID } = require("mongodb");
const { ValidationError } = require("./Errors");

/**
 * Node Manager, class responsible for handling persistence, validity, and
 * retrival of nodes from MongoDB.
 *
 * Node Schema:
 *   dataType {string} - one of "TEXT", "URL", or "DELETED"
 *   relationType {string} - one of "POST" or "COMMENT"
 *   title {string} - 1 to 300 characters
 *   content {string} - 1 to 40000 characters
 *   createdAt {Date} - JavaScript date,
 *   updatedAt {Date} - JavaScript date,
 *   createdById {ObjectId} - MongoDB Object ID mapping to User
 *   updatedById {ObjectId} - MongoDB Object ID mapping to User
 *   parentId {ObjectId} - MongoDB Object ID mapping to Node,
 */
class NodeManager {
  constructor(nodeCollection) {
    this.collection = nodeCollection;
    this.nodeLoader = new DataLoader(nodeIds => this._batchNodes(nodeIds), {
      cacheKeyFn: key => key.toString()
    });
  }

  /**
   * Auth Validation, check if the user is authenticated (existance of _id)
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
   * @param {string} relationType - String representation of relation type
   * @param {Array} errors - Array of errors
   */
  static validateTitle(title, relationType, errors) {
    if (relationType !== "COMMENT") {
      if (!title || (title && !title.trim())) {
        errors.push({
          key: "title",
          message: "Title must not be empty."
        });
      }
      if (("" + title).trim().length > 300) {
        errors.push({
          key: "title",
          message: "Title cannot be longer than 300 characters."
        });
      }
    }
  }

  /**
   * Content Validation, check if content is empty
   * @param {string} content - String representation of content
   * @param {Array} errors - Array of errors
   */
  static validateContent(content, errors) {
    if (!content || (content && !content.trim())) {
      errors.push({
        key: "content",
        message: "Content must not be empty."
      });
    }
    if (("" + content).trim().length > 40000) {
      errors.push({
        key: "content",
        message: "Content cannot be longer than 40000 characters."
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
      } catch (_) {
        errors.push({
          key: "content",
          message: "Content must be a valid url."
        });
      }
    }
  }

  /**
   * Update User validation, currently only check that ids match
   * @param {*} toUpdateNode - Mongo Document representation of node
   * @param {ObjectID} updatedById - Update User's Mongo Object ID
   * @param {Array} errors - Array of errors
   */
  static validateNodeModificationUser(toUpdateNode, updatedById, errors) {
    if (!updatedById.equals((toUpdateNode || {}).createdById)) {
      errors.push({
        key: "updatedBy",
        message: "Can only update own nodes."
      });
    }
  }

  /**
   * Update changes validation, check if any changes to original node exist
   * @param {*} toUpdateNode - Mongo Document, original node to update
   * @param {string?} dataType - new dataType value
   * @param {string?} title - new title value
   * @param {string?} content - new content value
   * @param {Array} errors - Array of errors
   */
  static validateUpdateDifferent(
    toUpdateNode,
    dataType,
    title,
    content,
    errors
  ) {
    if (
      (!dataType || dataType === toUpdateNode.dataType) &&
      (!title || title === toUpdateNode.title) &&
      (!content || content === toUpdateNode.content)
    ) {
      errors.push({
        key: "_id",
        message: "Cannot update node with no changes."
      });
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
   * Function for creating a single node
   * @param {*} createdBy - Mongo Document, user who created the node.
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
    NodeManager.validateTitle(title, relationType, errors);
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
      parentId: parentIdValidated
    };
    const response = await this.collection.insert(newNode);
    const newNodeId = response.insertedIds[0];
    return Object.assign({ _id: newNodeId }, newNode);
  }

  /**
   * Function for updating a single node
   * @param {String} id - Mongo Object ID of node to update
   * @param {*} updatedBy - Mongo Document, user who created the node.
   * @param {String?} dataType - Type of node ["TEXT", "URL"]
   * @param {String?} title - String, title of node
   * @param {String?} content - String, content of node
   */
  async updateNode(id, updatedBy, dataType, title, content) {
    const errors = [];
    const updatedById = NodeManager.validateAuthenticated(updatedBy, errors);
    const toUpdateNode = await this.getNodeById(id, true);
    NodeManager.validateNodeModificationUser(toUpdateNode, updatedById, errors);

    NodeManager.validateDataType(
      dataType || (toUpdateNode || {}).dataType,
      errors
    );
    NodeManager.validateTitle(
      title || (toUpdateNode || {}).title,
      (toUpdateNode || {}).relationType,
      errors
    );
    NodeManager.validateContent(
      content || (toUpdateNode || {}).content,
      errors
    );
    NodeManager.validateURL(
      dataType || (toUpdateNode || {}).dataType,
      content || (toUpdateNode || {}).content,
      errors
    );
    NodeManager.validateUpdateDifferent(
      toUpdateNode || {},
      dataType,
      title,
      content,
      errors
    );

    if (errors.length) {
      throw new ValidationError(errors);
    }

    const now = new Date();
    await this.collection.update(
      { _id: new ObjectID(id) },
      {
        $set: {
          updatedById,
          updatedAt: now,
          dataType: dataType || toUpdateNode.dataType,
          title: title || toUpdateNode.title,
          content: content || toUpdateNode.content
        }
      }
    );
    return await this.getNodeById(id, true);
  }

  /**
   * Function for deleting a single node
   * @param {String} id - Mongo Object ID of node to delete
   * @param {*} deletedBy - Mongo Document, user who deleted the node.
   */
  async deleteNode(id, deletedBy) {
    const errors = [];
    const updatedById = NodeManager.validateAuthenticated(deletedBy, errors);
    const toDeleteNode = await this.getNodeById(id, true);
    NodeManager.validateNodeModificationUser(toDeleteNode, updatedById, errors);

    if (errors.length) {
      throw new ValidationError(errors);
    }
    // don't actually do the delete
    // just set the title, content, createdBy, updatedBy, updatedAt, createdAt fields to be null.
    await this.collection.update(
      { _id: new ObjectID(id) },
      {
        $set: {
          dataType: "DELETED",
          createdById: null,
          updatedById: null,
          createdAt: null,
          updatedAt: null,
          title: null,
          content: null
        }
      }
    );
    return await this.getNodeById(id, true);
  }

  /**
   * Recursively build the filter tree. Outputs a mongodb compatible query
   * @param {NodeFilter} inputFilter - NodeFilter object (refer to schema)
   */
  static _buildFilters({
    OR,
    id,
    id_in, // id field is in this array
    parent,
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
    } else if (id_in !== undefined) {
      outputFilter._id = {
        $in: id_in.map(lookupId => {
          try {
            return new ObjectID(lookupId);
          } catch (_err) {
            return new ObjectID();
          }
        })
      };
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
  async getNodeById(id, clearCache = false) {
    if (id) {
      if (clearCache) {
        this.nodeLoader.clear(id);
      }
      return await this.nodeLoader.load(id);
    }
    return null;
  }

  /**
   * Given a node, find out if the potential parent is an actual parent
   * @param {string} nodeId - Mongo Object ID of child
   * @param {string?} potentialParentId - Mongo Object ID of potential parent
   */
  async isNodeIdAChildOfParentId(nodeId, potentialParentId) {
    // We are all a child of (null || undefined || false || ""), dear.
    if (!potentialParentId) {
      return true;
    }
    const result = await this.collection
      .aggregate([
        {
          $graphLookup: {
            from: "nodes",
            startWith: "$parentId",
            connectFromField: "parentId",
            connectToField: "_id",
            as: "ancestors"
          }
        },
        { $match: { _id: new ObjectID(nodeId) } },
        {
          $addFields: {
            ancestors: {
              $map: {
                input: "$ancestors",
                as: "t",
                in: { _id: "$$t._id" }
              }
            }
          }
        },
        {
          $match: {
            ancestors: {
              _id: new ObjectID(potentialParentId)
            }
          }
        }
      ])
      .toArray();
    return result.length > 0;
  }

  /**
   * Find the count of all immediate children of a node.
   * @param {string} nodeId - Mongo Object Id for node
   */
  async countImmediateChildren(nodeId) {
    if (!nodeId) {
      return 0;
    }
    const result = await this.collection
      .aggregate([
        {
          $match: {
            parentId: new ObjectID(nodeId)
          }
        },
        {
          $count: "immediate_children"
        }
      ])
      .toArray();
    return (result[0] || {}).immediate_children || 0;
  }

  /**
   * Find the count of all recurisvely nested children of a node.
   * @param {string} nodeId - Mongo Object Id for node
   */
  async countAllChildren(nodeId) {
    if (!nodeId) {
      return 0;
    }
    const result = await this.collection
      .aggregate([
        { $match: { _id: new ObjectID(nodeId) } },
        {
          $graphLookup: {
            from: "nodes",
            startWith: "$_id",
            connectFromField: "_id",
            connectToField: "parentId",
            as: "children"
          }
        },
        { $project: { total_children: { $size: "$children" } } }
      ])
      .toArray();
    return (result[0] || {}).total_children || 0;
  }
}

module.exports = NodeManager;
