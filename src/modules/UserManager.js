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

  /**
   * Function for dataloader to batch lookup of users
   * @param {Array<string>} keys - Arrays of user ids to batch lookup
   */
  async _batchUsers(keys) {
    return await this.collection.find({ _id: { $in: keys } }).toArray();
  }

  /**
   * Create a user and store in the DB
   * @param {string} name - Name of the user
   * @param {string} email - Email of the user
   * @param {string} rawPassword - Raw Password of the user
   */
  async createUser(name, email, rawPassword) {
    const existingEmail = await this.collection.find({ email }).toArray();
    if (existingEmail.length) {
      throw new ValidationError(
        "Email is already in use by another user.",
        "email"
      );
    }
    const password = await hashPassword(rawPassword);
    const newUser = { name, email, password };
    const response = await this.collection.insert(newUser);
    return response.ops[0];
  }

  async getUserById(id) {
    return await this.userLoader.load(id);
  }

  async getUserByEmail(email) {
    return await this.collection.findOne({ email });
  }
}

module.exports = UserManager;
