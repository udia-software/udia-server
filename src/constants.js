"use strict";
const { version } = require("../package.json");

// coverage don't care about environment variables
/* istanbul ignore next */
module.exports = {
  // application variables
  APP_VERSION: version,
  // environment variables
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "UDIA Development JWT Secret Key",
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || "",
  PORT: process.env.PORT || "3000",
  SALT_ROUNDS: process.env.SALT_ROUNDS || "12",
  TEST_JWT: process.env.TEST_JWT || "",
  SMTP_USERNAME: process.env.SMTP_USERNAME || "da4a6rdcusm7e2wt@ethereal.email",
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || "KtebcCbvkwDWsACqsB",
  SMTP_HOST: process.env.SMTP_HOST || "smtp.ethereal.email",
  SMTP_PORT: process.env.SMTP_PORT || "587",
  EMAIL_TOKEN_TIMEOUT: process.env.EMAIL_TOKEN_TIMEOUT || "3600000",
  REDIS_URL: process.env.REDIS_URL || "",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  CLIENT_DOMAINNAME: process.env.CLIENT_DOMAINNAME || "localhost:3001",
  CLIENT_PROTOCOL: process.env.CLIENT_PROTOCOL || "http",
  // static strings
  TOKEN_TYPES: {
    TOKEN_TYPE_VERIFY_EMAIL: "VERIFY_EMAIL",
    TOKEN_TYPE_RESET_PASSWORD: "RESET_PASSWORD"
  },
  AUDIT_ACTIVITIES: {
    CREATE_NODE: "CREATE_NODE",
    UPDATE_NODE: "UPDATE_NODE",
    DELETE_NODE: "DELETE_NODE",
    CREATE_USER: "CREATE_USER",
    RESEND_CONFIRMATION_EMAIL: "RESEND_CONFIRMATION_EMAIL",
    VERIFY_EMAIL: "VERIFY_EMAIL",
    CHANGE_EMAIL: "CHANGE_EMAIL",
    CHANGE_PASSWORD: "CHANGE_PASSWORD",
    RESET_PASSWORD_REQUEST: "RESET_PASSWORD_REQUEST",
    TOKEN_CHANGE_PASSWORD: "TOKEN_CHANGE_PASSWORD",
    LOGIN_ATTEMPT: "LOGIN_ATTEMPT",
    LOGIN_SUCCESS: "LOGIN_SUCCESS",
  },
  UNKNOWN_AUDIT_ACTIVITY: "UNKNOWN"
};
