"use strict";
const DataLoader = require("dataloader");
const { ObjectID } = require("mongodb");
const { hashPassword } = require("./Auth");
const { ValidationError } = require("./Errors");

class UserManager {
  constructor(userCollection) {
    this.collection = userCollection;
    this.userLoader = new DataLoader(userIds => this._batchUsers(userIds), {
      cacheKeyFn: key => key.toString()
    });
  }

  async _batchUsers(keys) {
    const objectIdKeys = keys.map(key => new ObjectID(key));
    return await this.collection.find({ _id: { $in: objectIdKeys } }).toArray();
  }

  async createUser(name, email, rawPassword) {
    const existingEmail = await this.collection.find({ email }).toArray();
    if (existingEmail.length) {
      throw new ValidationError("Email is already in use by another user.", "email");
    }
    const password = await hashPassword(rawPassword);
    const newUser = {
      name,
      email,
      password
    };
    const response = await this.collection.insert(newUser);
    return Object.assign({ id: response.insertedIds[0] }, { name, email });
  }

  async getUserById(id) {
    // return this.userLoader.load(id);
    return await this.collection.findOne({ _id: new ObjectID(id)});
  }

  async getUserByEmail(email) {
    return await this.collection.findOne({ email });
  }
}

module.exports = UserManager;
