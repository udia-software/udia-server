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
    return await this.collection
      .find({ _id: { $in: keys.map(key => new ObjectID(key)) } })
      .toArray()
      .then(users => keys.map(id => users.find(u => u._id.equals(id)) || null));
  }

  /**
   * Create a user and store in the DB
   * @param {string} username - Username of the user
   * @param {string} email - Email of the user
   * @param {string} password - Raw Password of the user
   */
  async createUser(username, email, password) {
    // if username already exists, user already exists, throw an error
    const existingUsername = await this.collection.find({ username }).toArray();
    if (existingUsername.length) {
      throw new ValidationError(
        "Username is already in use by another user.",
        "username"
      );
    }
    // if email already exists, user already exists, throw an error
    const existingEmail = await this.collection.find({ email }).toArray();
    if (existingEmail.length) {
      throw new ValidationError(
        "Email is already in use by another user.",
        "email"
      );
    }
    if (!username.trim().length) {
      throw new ValidationError(
        "Username cannot be empty.",
        "username"
      );
    }
    if (!email.trim().length) {
      throw new ValidationError(
        "Email cannot be empty.",
        "email"
      );
    }
    // simple regex for email matching
    const email_re = new RegExp("[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,}");
    if (!email_re.exec(email.trim().toUpperCase())) {
      throw new ValidationError(
        "Email must be in the form quantifier@domain.tld.",
        "email"
      );
    }
    if (!password) {
      throw new ValidationError(
        "Password cannot be empty.",
        "password"
      );
    }
    const passwordHash = await hashPassword(password);
    const now = new Date();
    const newUser = {
      username,
      email,
      createdAt: now,
      updatedAt: now,
      passwordHash
    };
    const response = await this.collection.insert(newUser);
    return Object.assign({ _id: response.insertedIds[0] }, newUser);
  }

  /**
   * Get a user from the db by ID
   * @param {string} id - string representation of mongo object ID
   */
  async getUserById(id) {
    return await this.userLoader.load(id);
  }

  /**
   * Get a user from the db by email
   * @param {string} email - user's email
   */
  async getUserByEmail(email) {
    return await this.collection.findOne({ email });
  }
}

module.exports = UserManager;
