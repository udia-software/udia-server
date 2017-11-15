"use strict";
const { ObjectID } = require("mongodb");
const { URL } = require("url");
const { ValidationError } = require("./Errors");

class LinkManager {
  constructor(linkCollection) {
    this.collection = linkCollection;
  }

  _buildFilters({ OR = [], description_contains, url_contains }) {
    const filter = description_contains || url_contains ? {} : null;
    if (description_contains) {
      filter.description = { $regex: `.*${description_contains}.*` };
    }
    if (url_contains) {
      filter.url = { $regex: `.*${url_contains}.*` };
    }

    let filters = filter ? [filter] : [];
    for (let i = 0; i < OR.length; i++) {
      filters = filters.concat(this._buildFilters(OR[i]));
    }
    return filters;
  }

  _assertValidLink({ url }) {
    try {
      new URL(url);
    } catch (error) {
      throw new ValidationError("Link validation error: invalid url.", "url");
    }
  }

  async createLink(url, description, postedBy) {
    const postedById = postedBy && postedBy._id;
    if (!postedById) {
      throw new ValidationError("Must be authenticated to create links.");
    }
    const newLink = { postedById, url, description };
    const response = await this.collection.insert(newLink);
    return Object.assign({ id: response.insertedIds[0] }, newLink);
  }

  async getLinks(filter, skip, first) {
    let query = filter ? { $or: this._buildFilters(filter) } : {};
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
    const link = await this.collection.findOne({_id: new ObjectID(id)});
    return link;
  }
}

module.exports = LinkManager;
