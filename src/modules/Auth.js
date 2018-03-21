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
  const bytes = crypto.AES.encrypt(
    JSON.stringify(rawValidationToken),
    JWT_SECRET
  );
  const b64 = bytes.toString();
  const e64 = crypto.enc.Base64.parse(b64);
  const eHex = e64.toString(crypto.enc.Hex);
  return eHex;
}

/**
 * Given a user and an email verification token, test if token is valid.
 * @param {string} token - Email verification Token
 * @param {string} type - Type of the token to validate
 */
function decryptAndParseValidationToken(token, type) {
  try {
    const reb64 = crypto.enc.Hex.parse(token);
    const bytes = reb64.toString(crypto.enc.Base64);
    const decrypt = crypto.AES.decrypt(bytes, JWT_SECRET);
    const plainText = decrypt.toString(crypto.enc.Utf8);
    const tokenObj = JSON.parse(plainText);
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
