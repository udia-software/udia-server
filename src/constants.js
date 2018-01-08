"use strict";

// coverage don't care about development environment
/* istanbul ignore next */
const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET = process.env.JWT_SECRET || "UDIA Development JWT Secret Key";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 12;
const TEST_JWT = process.env.TEST_JWT || "";

module.exports = {
  NODE_ENV,
  JWT_SECRET,
  MONGODB_URI,
  PORT,
  SALT_ROUNDS,
  TEST_JWT
};
