"use strict";

const { duration } = require("moment");
const nodemailer = require("nodemailer");
const { logger } = require("../logger");
const {
  SMTP_USERNAME,
  SMTP_PASSWORD,
  SMTP_HOST,
  SMTP_PORT,
  NODE_ENV,
  CLIENT_PROTOCOL,
  CLIENT_DOMAINNAME,
  EMAIL_TOKEN_TIMEOUT
} = require("../constants");

let config = {
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
  config = {
    streamTransport: true,
    newline: "unix",
    buffer: true
  };
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
  const validityTime = duration(EMAIL_TOKEN_TIMEOUT, "milliseconds").humanize();
  const urlNoToken = `${CLIENT_PROTOCOL}://${CLIENT_DOMAINNAME}/verify-email`;
  const urlWithToken = `${urlNoToken}/${validationToken}`;
  const payload = {
    from: {
      name: "UDIA",
      address: "do-not-reply@udia.ca"
    },
    to: {
      name: user.username,
      address: user.email
    },
    subject: "[UDIA] Validate Your Email",
    text: `This is your email validation token.
    \nIt is valid for ${validityTime} after request generation.
    \nYou may verify your email by going to the following link:
    \n${urlWithToken}
    \nor by manually copying and pasting your token:
    \n${validationToken}
    \nat
    \n${urlNoToken}`,
    html: `<p>This is your email validation token.
    <br/>It is valid for ${validityTime} after request generation.</p>
    <p>You may verify your email by clicking:
    <br/><a href="${urlWithToken}">${urlWithToken}</a>
    </p>
    <p>You may also verify your email by manually copying and pasting your token:</p>
    <pre>${validationToken}</pre>
    <p>to:
    <br/><a href="${urlNoToken}">${urlNoToken}</a></p>`
  };
  transport
    .sendMail(payload)
    .then(info => {
      logger.info("sendEmailVerification sent", info);
    })
    .catch(
      // coverage don't care about send mail failure, tests never fails
      /* istanbul ignore next */
      err => {
        logger.error("sendEmailVerification failed", err);
      }
    );
}

async function sendForgotPasswordEmail(user, validationToken) {
  const validityTime = duration(EMAIL_TOKEN_TIMEOUT, "milliseconds").humanize();
  const urlNoToken = `${CLIENT_PROTOCOL}://${CLIENT_DOMAINNAME}/password-reset`;
  const urlWithToken = `${urlNoToken}/${validationToken}`;
  const payload = {
    from: {
      name: "UDIA",
      address: "do-not-reply@udia.ca"
    },
    to: {
      name: user.username,
      address: user.email
    },
    subject: "[UDIA] Reset Your Password",
    text: `This is your password reset token.
    \nIt is valid for ${validityTime} after request generation.
    \nYou may verify your email by going to the following link:
    \n${urlWithToken}
    \nor by manually copying and pasting your token:
    \n${validationToken}
    \nat
    \n${urlNoToken}`,
    html: `<p>This is your password reset token.
    <br/>It is valid for ${validityTime} after request generation.</p>
    <p>You may verify your email by clicking:
    <br/><a href="${urlWithToken}">${urlWithToken}</a>
    </p>
    <p>You may also verify your email by manually copying and pasting your token:</p>
    <pre>${validationToken}</pre>
    <p>to:
    <br/><a href="${urlNoToken}">${urlNoToken}</a></p>`
  };
  transport
    .sendMail(payload)
    .then(info => {
      logger.info("sendForgotPasswordEmail sent", info);
    })
    .catch(
      // coverage don't care about send mail failure, tests never fails
      /* istanbul ignore next */
      err => {
        logger.error("sendForgotPasswordEmail failed", err);
      }
    );
}

module.exports = {
  sendEmailVerification,
  sendForgotPasswordEmail
};
