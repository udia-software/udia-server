"use strict";

const nodemailer = require("nodemailer");
const logger = require("../logger");
const {
  SMTP_USERNAME,
  SMTP_PASSWORD,
  SMTP_HOST,
  SMTP_PORT,
  NODE_ENV
} = require("../constants");

let config = {
  pool: true,
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: true,
  auth: {
    user: SMTP_USERNAME,
    pass: SMTP_PASSWORD
  }
};

// coverage don't care about non test route
/* istanbul ignore next */
if (NODE_ENV === "development") {
  config.pool = false;
  config.secure = false;
} else if (NODE_ENV === "test") {
  config = {
    streamTransport: true,
    newline: "unix"
  };
}
const transport = nodemailer.createTransport(config);

// https://nodemailer.com/message/
/**
 * Send email to user for email verification purposes
 * @param {*} user - MongoDB Document representing user
 * @param {string} validationToken - User's email validation token
 */
async function sendEmailVerification(user, validationToken) {
  const payload = {
    from: {
      name: "UDIA Server",
      address: "server@udia.ca"
    },
    to: {
      name: user.username,
      address: user.email
    },
    subject: "[UDIA] Validate Your Email",
    text: `This is your validation token. It is valid one hour after request generation.\n${validationToken}`,
    html: `<p>This is your validation token. It is valid one hour after request generation.</p></p>${validationToken}</p>`
  };
  try {
    return await transport.sendMail(payload);
  } catch (err) {
    // coverage don't care about send mail failure, tests never fails
    /* istanbul ignore next */
    logger.error("sendEmailVerification failed", err);
  }
}

async function sendForgotPasswordEmail(user, validationToken) {
  const payload = {
    from: {
      name: "UDIA Server",
      address: "server@udia.ca"
    },
    to: {
      name: user.username,
      address: user.email
    },
    subject: "[UDIA] Reset Your Password",
    text: `This is your password reset token. It is valid one hour after request generation.\n${validationToken}`,
    html: `<p>This is your password reset token. It is valid one hour after request generation.</p></p>${validationToken}</p>`
  };
  try {
    return await transport.sendMail(payload);
  } catch (err) {
    // coverage don't care about send mail failure, tests never fails
    /* istanbul ignore next */
    logger.error("sendForgotPasswordEmail failed", err);
  }
}

module.exports = {
  sendEmailVerification,
  sendForgotPasswordEmail
};
