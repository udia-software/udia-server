"use strict";

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, SALT_ROUNDS } = require("../constants");
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
  try {
    const tokenPayload = jwt.verify(token, JWT_SECRET);    
    const user = await Users.getUserById(tokenPayload.id);
    return user;
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
    throw new ValidationError([{
      key: "email",
      message: "User not found for given email.",
    }]);
  }
  const passwordsMatch = await bcrypt.compare(rawPassword, user.passwordHash);
  if (passwordsMatch) {
    const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, {
      expiresIn: "2 days",
      notBefore: "0"
    });
    return { token, user };
  }
  throw new ValidationError([{
    message: "Invalid password.",
    key: "rawPassword"
  }]);
}

module.exports = {
  hashPassword,
  verifyUserJWT,
  authenticateUser
};
