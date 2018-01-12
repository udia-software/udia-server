"use strict";

const DataLoader = require("dataloader");
const { ObjectID } = require("mongodb");
const { EMAIL_TOKEN_TIMEOUT } = require("../constants");
const {
  hashPassword,
  generateEmailValidationToken,
  decryptAndParseEmailValidationToken
} = require("./Auth");
const { ValidationError } = require("./Errors");
const { sendEmailVerification } = require("../mailer");

class UserManager {
  constructor(userCollection) {
    this.collection = userCollection;
    this.userLoader = new DataLoader(userIds => this._batchUsers(userIds), {
      cacheKeyFn: key => key.toString()
    });
  }

  /**
   * Email Validation, check email not already taken, is not empty
   * Email matches regular expression for 99% of all emails
   * @param {string} email - User's email entered
   * @param {Array} errors - Array of errors
   * @param {*} user - (Optional) Mongo Document, current user
   */
  async validateEmail(email, errors, user = null) {
    const existingEmail = await this.collection
      .find({ email: { $regex: new RegExp(`^${email}$`, "i") } })
      .toArray();
    const email_re = new RegExp("[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,}");
    if (existingEmail.length) {
      if (user && `${existingEmail[0]._id}` === `${user._id}`) {
        errors.push({
          key: "email",
          message: "New email is the same as old email."
        });
      } else {
        errors.push({
          key: "email",
          message: "Email is already in use by another user."
        });
      }
    }
    if (!email.trim().length) {
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
    const existingUsername = await this.collection
      .find({ username: { $regex: new RegExp(`^${username}$`, "i") } })
      .toArray();
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

    await this.validateEmail(email, errors);

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
    const userData = {
      username,
      email,
      createdAt: now,
      updatedAt: now,
      passwordHash,
      emailVerified: false
    };
    const response = await this.collection.insert(userData);
    const newUser = Object.assign({ _id: response.insertedIds[0] }, userData);
    await sendEmailVerification(newUser, generateEmailValidationToken(newUser));
    return newUser;
  }

  async changeEmail(user, email) {
    const errors = [];
    if (!user) {
      errors.push({
        key: "user",
        message: "User must be authenticated."
      });
    }
    await this.validateEmail(email, errors, user);
    if (errors.length) {
      throw new ValidationError(errors);
    }
    await this.collection.update(
      { _id: user._id },
      { $set: { email, emailVerified: false } }
    );
    const updatedUser = await this.getUserById(user._id, true);
    await sendEmailVerification(
      updatedUser,
      generateEmailValidationToken(updatedUser)
    );
    return updatedUser;
  }

  /**
   * Confirm an authenticated user's email
   * @param {string} emailValidationToken - validation token sent to their email
   */
  async confirmEmail(emailValidationToken) {
    const decryptedToken = decryptAndParseEmailValidationToken(
      emailValidationToken
    );
    if (decryptedToken && decryptedToken._id) {
      const user = await this.getUserById(decryptedToken._id);
      if (
        user &&
        user.email === decryptedToken.email &&
        decryptedToken.exp > 0 &&
        decryptedToken.exp > Date.now() &&
        decryptedToken.exp < Date.now() + +EMAIL_TOKEN_TIMEOUT
      ) {
        await this.collection.update(
          { _id: user._id },
          {
            $set: { emailVerified: true }
          }
        );
        this.userLoader.clear("" + user._id);
        return true;
      }
    }
    return false;
  }

  /**
   * Resend the user's confirmation email, if the email is not verified.
   * If email is sent, return true. Otherwise return false or throw error
   * @param {*} user - Mongo Document representing user
   */
  async resendConfirmationEmail(user) {
    if (!user) {
      throw new ValidationError([
        { key: "user", message: "User must be authenticated." }
      ]);
    }
    if (!user.emailVerified) {
      await sendEmailVerification(user, generateEmailValidationToken(user));
      return true;
    }
    return false;
  }

  /**
   * Get a user from the db by ID
   * @param {string} id - string representation of mongo object ID
   */
  async getUserById(id, clearCache = false) {
    if (id) {
      if (clearCache) {
        this.userLoader.clear(id);
      }
      return await this.userLoader.load(id);
    }
    return null;
  }

  /**
   * Get a user from the db by email
   * @param {string} email - user's email
   */
  async getUserByEmail(email) {
    return await this.collection.findOne({ email });
  }

  /**
   * Delete a user from the database
   * @param {ObjectID} id - Mongo Object ID
   */
  async _deleteUserById(id) {
    await this.collection.remove({ _id: id }, { justOne: true });
    this.userLoader.clear(id);
  }
}

module.exports = UserManager;
