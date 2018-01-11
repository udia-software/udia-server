"use strict";

// coverage don't care about environment variables
/* istanbul ignore next */
module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "UDIA Development JWT Secret Key",
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017",
  PORT: process.env.PORT || "3000",
  SALT_ROUNDS: process.env.SALT_ROUNDS || "12",
  TEST_JWT: process.env.TEST_JWT || "",
  SMTP_USERNAME: process.env.SMTP_USERNAME || "da4a6rdcusm7e2wt@ethereal.email",
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || "KtebcCbvkwDWsACqsB",
  SMTP_HOST: process.env.SMTP_HOST || "smtp.ethereal.email",
  SMTP_PORT: process.env.SMTP_PORT || "587",
  EMAIL_TOKEN_TIMEOUT: process.env.EMAIL_TOKEN_TIMEOUT || "3600000"
};
