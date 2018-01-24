"use strict";

const bcrypt = require("bcrypt");
const crypto = require("crypto-js");
const jwt = require("jsonwebtoken");
const {
  JWT_SECRET,
  SALT_ROUNDS,
  EMAIL_TOKEN_TIMEOUT
} = require("../constants");
const { ValidationError } = require("./Errors");

/**
 * Take a string password and return the bcrypt hash
 * @param {string} rawPassword - raw password
 */
async function hashPassword(rawPassword) {
  return await bcrypt.hash(rawPassword, +SALT_ROUNDS);
}

/**
 * Given a jwt token, validate and return the corresponding user
 * @param {express} param0 - express object to get authorization token from
 * @param {UserManager} Users - User Manager instance
 */
async function verifyUserJWT({ headers: { authorization } }, Users) {
  const token = authorization || "";
  return await Users.getUserById(getIdFromJWT(token));
}

function getIdFromJWT(token) {
  try {
    const tokenPayload = jwt.verify(token, JWT_SECRET);
    return tokenPayload.id;
  } catch (_) {
    return null;
  }
}

/**
 * Given an email and password, validate and return the JWT and user
 * @param {string} rawPassword - raw password
 * @param {string} email - email to lookup for
 * @param {UserManager} Users - User Manager instance
 */
async function authenticateUser(rawPassword, email, Users) {
  const user = await Users.getUserByEmail(email);
  if (!user) {
    throw new ValidationError([
      {
        key: "email",
        message: "User not found for given email."
      }
    ]);
  }
  const passwordsMatch = await bcrypt.compare(rawPassword, user.passwordHash);
  if (passwordsMatch) {
    const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, {
      expiresIn: "2 days",
      notBefore: "0"
    });
    return { token, user };
  }
  throw new ValidationError([
    {
      message: "Invalid password.",
      key: "rawPassword"
    }
  ]);
}

/**
 * Given a user, and type of token, generate the verification token.
 * @param {*} user - Mongo Document for user object
 * @param {string} type - Type of the token to send
 */
function generateValidationToken(user, type) {
  const rawValidationToken = {
    type,
    email: "" + user.email,
    _id: "" + user._id,
    exp: Date.now() + +EMAIL_TOKEN_TIMEOUT
  };
  const cypherText = crypto.AES.encrypt(
    JSON.stringify(rawValidationToken),
    JWT_SECRET
  );
  return cypherText.toString();
}

/**
 * Given a user and an email verification token, test if token is valid.
 * @param {string} token - Email verification Token
 * @param {string} type - Type of the token to validate
 */
function decryptAndParseValidationToken(token, type) {
  try {
    const bytes = crypto.AES.decrypt(token, JWT_SECRET);
    const tokenObj = JSON.parse(bytes.toString(crypto.enc.Utf8));
    if (tokenObj.type === type) {
      return tokenObj;
    }
    return null;
  } catch (err) {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyUserJWT,
  authenticateUser,
  generateValidationToken,
  decryptAndParseValidationToken
};
