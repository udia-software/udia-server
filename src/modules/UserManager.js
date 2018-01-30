"use strict";

const DataLoader = require("dataloader");
const { ObjectID } = require("mongodb");
const { EMAIL_TOKEN_TIMEOUT, TOKEN_TYPES } = require("../constants");
const {
  hashPassword,
  generateValidationToken,
  decryptAndParseValidationToken
} = require("./Auth");
const { ValidationError } = require("./Errors");
const { sendEmailVerification, sendForgotPasswordEmail } = require("../mailer");

/**
 * username,
 * email,
 * createdAt: now,
 * updatedAt: now,
 * passwordHash,
 * emailVerified: false
 */
class UserManager {
  constructor(userCollection) {
    this.collection = userCollection;
    this.userLoader = new DataLoader(userIds => this._batchUsers(userIds), {
      cacheKeyFn: key => key.toString()
    });
  }

  /**
   * Auth Validation, check if the user is authenticated (existance of _id)
   * @param {*} user - Mongo Document containing user
   * @param {Array} errors - Array of errors
   */
  static validateAuthenticated(user, errors) {
    const userId = user && user._id;
    if (!userId) {
      errors.push({
        key: "createdBy",
        message: "User must be authenticated."
      });
    }
    return userId;
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
   * Username Validation
   * Check Username not already taken, Username is not empty
   * Check username is alpha numeric with underscores
   * Check username length is under 16 chars
   * @param {string} username - proposed username for a user
   * @param {*} errors - array of errors
   */
  async validateUsername(username, errors) {
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
  }

  /**
   * Password Validation
   * Password is not empty and is greater than 6 characters.
   * @param {*} password
   * @param {*} errors
   */
  static validatePassword(password, errors) {
    if (!password) {
      errors.push({
        key: "password",
        message: "Password cannot be empty."
      });
    } else if (password.length < 6) {
      errors.push({
        key: "password",
        message: "Password must be 6 or more characters."
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

    await this.validateUsername(username, errors);
    await this.validateEmail(email, errors);
    UserManager.validatePassword(password, errors);

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
    await sendEmailVerification(
      newUser,
      generateValidationToken(newUser, TOKEN_TYPES.TOKEN_TYPE_VERIFY_EMAIL)
    );
    return newUser;
  }

  async changeEmail(user, email) {
    const errors = [];
    UserManager.validateAuthenticated(user, errors);
    await this.validateEmail(email, errors, user);
    if (errors.length) {
      throw new ValidationError(errors);
    }
    await this.collection.update(
      { _id: user._id },
      { $set: { email, emailVerified: false, updatedAt: new Date() } }
    );
    const updatedUser = await this.getUserById(user._id, true);
    await sendEmailVerification(
      updatedUser,
      generateValidationToken(updatedUser, TOKEN_TYPES.TOKEN_TYPE_VERIFY_EMAIL)
    );
    return updatedUser;
  }

  /**
   * Confirm an authenticated user's email
   * @param {string} emailValidationToken - validation token sent to their email
   */
  async confirmEmail(emailValidationToken) {
    const decryptedToken = decryptAndParseValidationToken(
      emailValidationToken,
      TOKEN_TYPES.TOKEN_TYPE_VERIFY_EMAIL
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
            $set: { emailVerified: true, updatedAt: new Date() }
          }
        );
        this.userLoader.clear("" + user._id);
        return { user, confirmedEmail: true };
      }
    }
    return { user: null, confirmedEmail: false };
  }

  /**
   * Resend the user's confirmation email, if the email is not verified.
   * If email is sent, return true. Otherwise return false or throw error
   * @param {*} user - Mongo Document representing user
   */
  async resendConfirmationEmail(user) {
    const errors = [];
    UserManager.validateAuthenticated(user, errors);
    if (errors.length) {
      throw new ValidationError(errors);
    }
    if (!user.emailVerified) {
      await sendEmailVerification(
        user,
        generateValidationToken(user, TOKEN_TYPES.TOKEN_TYPE_VERIFY_EMAIL)
      );
      return true;
    }
    return false;
  }

  /**
   * Check for user with the forgotten email, then send password reset token
   * @param {string} email - email of user with forgotten password
   */
  async forgotPasswordRequest(email) {
    const user = await this.getUserByEmail(email);
    if (user && user._id) {
      await sendForgotPasswordEmail(
        user,
        generateValidationToken(user, TOKEN_TYPES.TOKEN_TYPE_RESET_PASSWORD)
      );
      return true;
    }
    return false;
  }

  /**
   * Update a password using a forgot password token
   * @param {string} token - password reset verification token
   * @param {string} password - new password
   */
  async updatePasswordWithToken(token, password) {
    const decryptedToken = decryptAndParseValidationToken(
      token,
      TOKEN_TYPES.TOKEN_TYPE_RESET_PASSWORD
    );
    if (!decryptedToken) {
      throw new ValidationError([
        { key: "token", message: "Invalid password reset token." }
      ]);
    }
    const user = await this.getUserById(decryptedToken && decryptedToken._id);
    return await this.updatePassword(user, password);
  }

  /**
   * Update a password using the authenticated user object
   * @param {*} user - Mongo DB document representing user
   * @param {string} password - new password
   */
  async updatePassword(user, password) {
    const errors = [];
    UserManager.validatePassword(password, errors);
    UserManager.validateAuthenticated(user, errors);
    if (errors.length) {
      throw new ValidationError(errors);
    }
    const passwordHash = await hashPassword(password);
    await this.collection.update(
      { _id: user._id },
      { $set: { passwordHash, updatedAt: new Date() } }
    );
    this.userLoader.clear("" + user._id);
    return await this.getUserById(user._id);
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
