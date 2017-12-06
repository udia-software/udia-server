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
    const errors = [];

    // Username Validation
    // * Username not already taken
    // * Username is not empty
    // * Check username is alpha numeric with underscores
    // * Check username length is under 16 chars
    const existingUsername = await this.collection.find({ username: { $regex: new RegExp(`^${username}$`, "i")} }).toArray();
    const alphaNumDashUnderscore_re = new RegExp("^[a-zA-Z0-9_]+$");
    if (existingUsername.length) {
      errors.push({
        key: "username",
        message: "Username is already in use by another user."
      });
    } else if (!username.trim().length) {
      errors.push({
        key: "username",
        message: "Username cannot be empty."
      });
    } else if (!alphaNumDashUnderscore_re.exec(username.trim())) {
      errors.push({
        key: "username",
        message: "Username must be alphanumeric with underscores."
      });
    }
    if (username.trim().length >= 16) {
      errors.push({
        key: "username",
        message: "Username cannot be over 15 characters long."
      });
    }

    // Email Validation
    // * Email not already taken
    // * Email is not empty
    // * Email matches regular expression for 99% of all emails
    const existingEmail = await this.collection.find({ email: { $regex: new RegExp(`^${email}$`, "i") } }).toArray();
    const email_re = new RegExp("[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,}");
    if (existingEmail.length) {
      errors.push({
        key: "email",
        message: "Email is already in use by another user."
      });
    } else if (!email.trim().length) {
      errors.push({
        key: "email",
        message: "Email cannot be empty."
      });
    } else if (!email_re.exec(email.trim().toUpperCase())) {
      errors.push({
        key: "email",
        message: "Email must be in the form quantifier@domain.tld."
      });
    }

    // Password Validation
    // * Password is not empty
    if (!password) {
      errors.push({
        key: "password",
        message: "Password cannot be empty."
      });
    }
    
    if (errors.length) {
      throw new ValidationError(errors);
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
